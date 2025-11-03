'use client'

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import type { ChatMessage } from '@/types/supabase'
import type { PlanKey } from '@/config/pricing'
import toast, { Toaster } from 'react-hot-toast'
import MechanicProfileModal from '@/components/MechanicProfileModal'
import { SessionCompletionModal } from '@/components/session/SessionCompletionModal'

type Message = Pick<ChatMessage, 'id' | 'content' | 'created_at' | 'sender_id'> & {
  attachments?: Array<{ name: string; url: string; size: number; type: string }>
  read_at?: string | null
}

// Lazy-loaded image component with IntersectionObserver
const LazyImage = memo(({ src, alt, className, onClick }: {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' } // Load images 100px before they enter viewport
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} className="relative w-full">
      {isInView ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 animate-pulse rounded-lg">
              <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={() => setIsLoaded(true)}
            onClick={onClick}
          />
        </>
      ) : (
        <div className="w-full h-48 bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center">
          <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  )
})

LazyImage.displayName = 'LazyImage'

type ChatRoomProps = {
  sessionId: string
  userId: string
  userRole: 'mechanic' | 'customer'
  userEmail: string | null
  planName: string
  plan: string
  isFreeSession: boolean
  status: string | null
  startedAt: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  initialMessages: Message[]
  initialParticipants: Array<{ user_id: string; role: string }>
  mechanicName: string | null
  customerName: string | null
  mechanicId: string | null
  customerId: string | null
  dashboardUrl: string
}

function formatTimestamp(iso: string) {
  try {
    const date = new Date(iso)
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return ''
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ChatRoom({
  sessionId,
  userId,
  userRole,
  planName,
  plan,
  isFreeSession,
  status,
  startedAt,
  initialMessages,
  mechanicName: initialMechanicName,
  customerName: initialCustomerName,
  mechanicId: initialMechanicId,
  customerId: initialCustomerId,
  dashboardUrl,
}: Omit<ChatRoomProps, 'userEmail' | 'scheduledStart' | 'scheduledEnd' | 'initialParticipants'>) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(() => [...initialMessages])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [extendingSession, setExtendingSession] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showSessionMenu, setShowSessionMenu] = useState(false)
  const [showEndSessionModal, setShowEndSessionModal] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
  const [showMechanicProfileModal, setShowMechanicProfileModal] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentStartedAt, setCurrentStartedAt] = useState(startedAt)
  const [mechanicName, setMechanicName] = useState<string | null>(initialMechanicName)
  const [customerName, setCustomerName] = useState<string | null>(initialCustomerName)
  const [mechanicId, setMechanicId] = useState<string | null>(initialMechanicId)
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId)
  const [participantJoined, setParticipantJoined] = useState(false)
  const [mechanicPresent, setMechanicPresent] = useState(false)
  const [customerPresent, setCustomerPresent] = useState(false)
  const [sessionStartInitiated, setSessionStartInitiated] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false) // Hidden by default on mobile
  const [vehicleInfo, setVehicleInfo] = useState<any>(null)
  const [mechanicProfile, setMechanicProfile] = useState<any>(null)
  const [intakeData, setIntakeData] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showVehicleBar, setShowVehicleBar] = useState(true) // Collapsed by default
  const [sidebarSwipeStart, setSidebarSwipeStart] = useState<number | null>(null)
  const [sidebarSwipeOffset, setSidebarSwipeOffset] = useState(0)
  const [isMounted, setIsMounted] = useState(false) // Track if component is mounted (for Portal)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionSessionData, setCompletionSessionData] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isMechanic = userRole === 'mechanic'
  const bothParticipantsPresent = mechanicPresent && customerPresent

  // Calculate session duration in minutes
  const sessionDurationMinutes = useMemo(() => {
    // Check for free/trial plans first
    if (plan === 'free' || plan === 'trial' || plan === 'trial-free') {
      return 5 // Free sessions are 5 minutes
    }

    // Check for paid plans
    const planKey = plan as PlanKey
    if (planKey === 'chat10') return 30
    if (planKey === 'video15') return 45
    if (planKey === 'diagnostic') return 60

    // Default fallback (shouldn't happen)
    return 30
  }, [plan])

  // Track component mount state for Portal rendering
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Reset zoom/pan when image changes
  useEffect(() => {
    if (selectedImage) {
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
      setLastTouchDistance(null)
    }
  }, [selectedImage])

  // Image zoom/pan handlers
  const handleImageWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setImageZoom((prev) => Math.max(0.5, Math.min(5, prev * delta)))
  }

  const handleImageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1 && imageZoom > 1) {
      // Pan gesture (only when zoomed)
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - imagePosition.x, y: e.touches[0].clientY - imagePosition.y })
    }
  }

  const handleImageTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      // Pinch zoom
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      const scale = distance / lastTouchDistance
      setImageZoom((prev) => Math.max(0.5, Math.min(5, prev * scale)))
      setLastTouchDistance(distance)
    } else if (e.touches.length === 1 && isDragging && imageZoom > 1) {
      // Pan
      e.preventDefault()
      setImagePosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      })
    }
  }

  const handleImageTouchEnd = () => {
    setIsDragging(false)
    setLastTouchDistance(null)
  }

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
    }
  }

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleImageMouseUp = () => {
    setIsDragging(false)
  }

  const handleImageDoubleClick = () => {
    if (imageZoom > 1) {
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
    } else {
      setImageZoom(2)
    }
  }

  const closeImageModal = () => {
    setSelectedImage(null)
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
    setIsDragging(false)
    setLastTouchDistance(null)
  }

  // Sidebar swipe gesture handlers
  const handleSidebarTouchStart = (e: React.TouchEvent) => {
    setSidebarSwipeStart(e.touches[0].clientX)
    setSidebarSwipeOffset(0)
  }

  const handleSidebarTouchMove = (e: React.TouchEvent) => {
    if (sidebarSwipeStart === null) return

    const currentX = e.touches[0].clientX
    const diff = currentX - sidebarSwipeStart

    // Only allow swiping right (closing)
    if (diff > 0) {
      setSidebarSwipeOffset(diff)
    }
  }

  const handleSidebarTouchEnd = () => {
    if (sidebarSwipeOffset > 100) {
      // Swipe distance threshold to close
      setShowSidebar(false)
    }
    setSidebarSwipeStart(null)
    setSidebarSwipeOffset(0)
  }

  // Sync messages state with initialMessages prop when navigating back to chat
  useEffect(() => {
    // Only update if we have initial messages and they're different from current state
    if (initialMessages.length > 0) {
      setMessages((prev) => {
        // If current state is empty or significantly different, reset to initial messages
        if (prev.length === 0 || prev.length !== initialMessages.length) {
          return [...initialMessages]
        }
        // Otherwise keep current state (which includes real-time updates)
        return prev
      })
    }
  }, [initialMessages])

  // Fetch updated participant info, vehicle data, and mechanic profile
  useEffect(() => {
    async function fetchSessionInfo() {
      try {
        const response = await fetch(`/api/chat/session-info?sessionId=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          setCurrentStatus(data.status)

          // Set participant IDs
          if (data.mechanicId) {
            setMechanicId(data.mechanicId)
          }
          if (data.customerId) {
            setCustomerId(data.customerId)
          }

          // Update names
          if (data.mechanicName && !mechanicName) {
            setMechanicName(data.mechanicName)
          }
          if (data.customerName && !customerName) {
            setCustomerName(data.customerName)
          }

          // Store intake data (problem description, etc.)
          if (data.intakeData) {
            setIntakeData(data.intakeData)
          }

          // Fetch vehicle info if customer
          if (data.customerId) {
            const { data: vehicles } = await supabase
              .from('vehicles')
              .select('*')
              .eq('user_id', data.customerId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (vehicles) setVehicleInfo(vehicles)
          }

          // Fetch mechanic profile with about_me
          if (data.mechanicId) {
            const { data: mechanic } = await supabase
              .from('mechanics')
              .select('id, name, about_me, specializations, rating, total_sessions')
              .eq('user_id', data.mechanicId)  // Query by user_id since mechanicId is auth.users.id
              .maybeSingle()
            if (mechanic) setMechanicProfile(mechanic)
          }
        }
      } catch (err) {
        console.error('Failed to fetch session info:', err)
      }
    }
    fetchSessionInfo()
  }, [sessionId, mechanicName, customerName, supabase])

  // Track presence using Supabase Presence and start session when both join
  useEffect(() => {
    if (!mechanicId || !customerId) return

    console.log('[ChatRoom] Setting up presence tracking')

    const presenceChannel = supabase.channel(`presence-${sessionId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Track current user's presence
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        console.log('[ChatRoom] Presence sync - full state:', JSON.stringify(state, null, 2))
        console.log('[ChatRoom] Looking for mechanicId:', mechanicId, 'customerId:', customerId)

        // CRITICAL FIX: Check presence payload VALUES, not KEYS
        // Supabase uses connection UUIDs as keys, we need to check user_id in the payload
        const mechanicIsPresent = !!(mechanicId && Object.values(state).some(
          (entries: any) => Array.isArray(entries) && entries.some((entry: any) => entry.user_id === mechanicId)
        ))
        const customerIsPresent = !!(customerId && Object.values(state).some(
          (entries: any) => Array.isArray(entries) && entries.some((entry: any) => entry.user_id === customerId)
        ))

        setMechanicPresent(mechanicIsPresent)
        setCustomerPresent(customerIsPresent)

        console.log('[ChatRoom] Presence status:', {
          mechanicIsPresent,
          customerIsPresent,
          mechanicId,
          customerId,
          totalPresent: Object.keys(state).length
        })
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[ChatRoom] User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[ChatRoom] User left:', key)
      })
      .subscribe(async (status) => {
        console.log('[ChatRoom] Channel subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[ChatRoom] Tracking presence:', { userId, userRole })
          await presenceChannel.track({
            user_id: userId,
            role: userRole,
            online_at: new Date().toISOString(),
          })
          console.log('[ChatRoom] Presence tracked successfully')
        }
      })

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [sessionId, userId, userRole, mechanicId, customerId, supabase])

  // Start session when both participants join
  useEffect(() => {
    if (!bothParticipantsPresent || sessionStartInitiated) return
    if (currentStatus !== 'waiting') return

    console.log('[ChatRoom] Both participants present - starting session')
    setSessionStartInitiated(true)

    // Call API to mark session as started
    fetch(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        console.log('[ChatRoom] Session start response:', data)
        if (data.success) {
          setCurrentStatus('live')
          setCurrentStartedAt(data.session.started_at)
        }
      })
      .catch(err => {
        console.error('[ChatRoom] Failed to start session:', err)
        setSessionStartInitiated(false)
      })
  }, [bothParticipantsPresent, sessionStartInitiated, currentStatus, sessionId])

  // Timer countdown logic with server-authoritative auto-end
  useEffect(() => {
    if (currentStatus?.toLowerCase() !== 'live' || !currentStartedAt) return

    const startTime = new Date(currentStartedAt).getTime()
    const durationMs = sessionDurationMinutes * 60 * 1000

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - startTime
      const remaining = Math.max(0, durationMs - elapsed)

      setTimeRemaining(Math.ceil(remaining / 1000)) // in seconds

      // Session expired - server-authoritative end
      if (remaining <= 0 && !sessionEnded) {
        setSessionEnded(true)
        clearInterval(interval)

        // Auto-call end endpoint
        console.log('[ChatRoom] Timer expired - auto-ending session')
        fetch(`/api/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
          .then((res) => res.json())
          .then(async (data) => {
            console.log('[ChatRoom] Session auto-ended:', data)
            // Show toast notification
            toast.error('Your session time has ended', {
              duration: 4000,
              position: 'top-center',
            })
            // Show completion modal instead of redirecting
            await fetchAndShowCompletionModal()
          })
          .catch((err) => {
            console.error('[ChatRoom] Failed to auto-end session:', err)
            // Show extend modal as fallback
            setShowExtendSessionModal(true)
          })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, currentStatus, currentStartedAt, sessionDurationMinutes, sessionEnded, dashboardUrl])

  // Scroll monitoring for scroll-to-bottom button with debouncing
  // With flex-col-reverse, scrollTop=0 is the visual bottom (newest messages)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // Debounce scroll handling for better performance
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const { scrollTop } = container
        // With flex-col-reverse: scrollTop=0 is bottom, higher values = scrolling up
        const isNearBottom = Math.abs(scrollTop) < 200
        setShowScrollButton(!isNearBottom)
      }, 100) // Update every 100ms max
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Auto-scroll messages container to bottom (NOT the whole page)
  // This keeps the input box in view while showing latest messages
  // With flex-col-reverse, scrollTop=0 is the visual bottom
  const prevMessagesLengthRef = useRef(messages.length)

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const prevLength = prevMessagesLengthRef.current
    const newLength = messages.length

    // Always auto-scroll the messages container to bottom when new messages arrive
    // But DON'T scroll the page itself (keeps input box visible)
    if (newLength > prevLength) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        container.scrollTop = 0 // With flex-col-reverse, 0 is the bottom
      }, 50)
    }

    prevMessagesLengthRef.current = newLength
  }, [messages.length])

  // Scroll to bottom function - scrolls ONLY the messages container
  // With flex-col-reverse, scrollTop=0 is the visual bottom
  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = 0 // With flex-col-reverse, 0 is the bottom
    }
  }

  // 🔒 SECURITY LAYER 2: Client-side status validation (backup for server-side)
  // Only redirects if session is ALREADY completed when component mounts
  // Prevents accessing completed sessions via back button/bookmark
  useEffect(() => {
    console.log('[CHAT SECURITY L2] Checking initial session status:', status)
    if (status === 'completed' || status === 'cancelled') {
      console.log('[CHAT SECURITY L2] ⚠️ Session already ended, redirecting...')
      window.location.href = dashboardUrl
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount, not on status changes

  // Real-time subscriptions including typing indicators
  useEffect(() => {
    console.log('[ChatRoom] Setting up real-time subscription for session:', sessionId)

    const channel = supabase
      .channel(`session-${sessionId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
        },
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { sender, typing } = payload.payload
        console.log('[ChatRoom] Typing indicator:', sender, typing)

        if (sender !== userId) {
          setIsTyping(typing)

          // Auto-hide typing indicator after 3 seconds
          if (typing && typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          if (typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false)
            }, 3000)
          }
        }
      })
      .on('broadcast', { event: 'new_message' }, (payload) => {
        console.log('[ChatRoom] Received broadcast message:', payload)
        const msg = payload.payload.message
        if (msg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) {
              console.log('[ChatRoom] Message already exists, skipping:', msg.id)
              return prev
            }
            console.log('[ChatRoom] Adding new message to state:', msg.id)
            return [
              ...prev,
              {
                id: msg.id,
                content: msg.content,
                created_at: msg.created_at,
                read_at: msg.read_at || null,
                sender_id: msg.sender_id,
                attachments: msg.attachments || [],
              },
            ]
          })
        }
      })
      .on('broadcast', { event: 'session:ended' }, async (payload) => {
        console.log('[ChatRoom] Session ended by other participant:', payload)
        const { status, endedBy } = payload.payload
        setSessionEnded(true)
        setCurrentStatus(status)

        // If cancelled, redirect to dashboard after showing alert
        if (status === 'cancelled') {
          // Determine who ended the session for notification
          const endedByText = endedBy === 'mechanic'
            ? mechanicName || 'the mechanic'
            : customerName || 'the customer'

          toast.error(
            `Session has been cancelled by ${endedByText}`,
            {
              duration: 3000,
              position: 'top-center',
              icon: '❌',
            }
          )

          setTimeout(() => {
            window.location.href = dashboardUrl
          }, 2000)
        } else {
          // If completed, show completion modal
          toast.success('Session completed', {
            duration: 2000,
            position: 'top-center',
          })
          await fetchAndShowCompletionModal()
        }
      })
      .on('broadcast', { event: 'session:extended' }, (payload) => {
        console.log('[ChatRoom] Session extended:', payload)
        const { extensionMinutes, newExpiresAt } = payload.payload

        // Show notification
        toast.success(`Session extended by ${extensionMinutes} minutes!`, {
          duration: 4000,
          position: 'top-center',
          icon: '⏱️',
        })

        // Reset timer based on new expiry time
        if (newExpiresAt && currentStartedAt) {
          const newExpiry = new Date(newExpiresAt).getTime()
          const startTime = new Date(currentStartedAt).getTime()
          const newDurationSeconds = Math.ceil((newExpiry - startTime) / 1000)

          // Update time remaining
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const remaining = Math.max(0, newDurationSeconds - elapsed)
          setTimeRemaining(remaining)

          console.log(`[ChatRoom] Timer updated: ${remaining}s remaining`)
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('[ChatRoom] Session updated:', payload)
          const updated = payload.new as any
          const oldStatus = currentStatus
          setCurrentStatus(updated.status)

          // Sync started_at to ensure both users have the same reference time
          if (updated.started_at) {
            setCurrentStartedAt(updated.started_at)
          }

          // 🔒 SECURITY LAYER 3: Real-time database status monitoring
          // Shows completion modal for normal endings, redirects for external cancellations
          if ((oldStatus === 'live' || oldStatus === 'waiting') &&
              (updated.status === 'completed' || updated.status === 'cancelled')) {
            console.log(`[CHAT SECURITY L3] Session status changed to ${updated.status}`)

            setSessionEnded(true)

            // Handle based on completion status
            if (updated.status === 'cancelled') {
              // Cancelled sessions redirect immediately (admin/external cancellation)
              console.log('[CHAT SECURITY L3] ⚠️ Session cancelled externally, redirecting...')
              toast.error('Session has been cancelled', {
                duration: 2000,
                position: 'top-center',
              })
              // Redirect after showing toast
              setTimeout(() => {
                window.location.href = dashboardUrl
              }, 2000)
            } else {
              // Completed sessions show modal (normal ending flow)
              console.log('[CHAT SECURITY L3] ✅ Session completed, showing modal...')
              toast.success('Session completed', {
                duration: 2000,
                position: 'top-center',
              })
              await fetchAndShowCompletionModal()
            }
          }

          // If mechanic just joined, fetch their name and show notification
          if (updated.mechanic_id && !mechanicId) {
            setMechanicId(updated.mechanic_id)
            try {
              const response = await fetch(`/api/chat/session-info?sessionId=${sessionId}`)
              if (response.ok) {
                const data = await response.json()
                const name = data.mechanicName || 'Mechanic'
                setMechanicName(name)

                // Show join notification for customer
                if (!isMechanic) {
                  setParticipantJoined(true)
                  setTimeout(() => setParticipantJoined(false), 5000)
                }
              }
            } catch (err) {
              console.error('Failed to fetch mechanic name:', err)
            }
          }

          // Track customer ID
          if (updated.customer_user_id && !customerId) {
            setCustomerId(updated.customer_user_id)
          }
        }
      )
      .subscribe((status) => {
        console.log('[ChatRoom] Subscription status:', status)
      })

    // Store channel reference for reuse in broadcasting
    channelRef.current = channel

    return () => {
      console.log('[ChatRoom] Cleaning up subscription')
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, mechanicName, currentStatus, customerId, isMechanic, mechanicId])

  async function uploadFile(file: File): Promise<{ name: string; url: string; size: number; type: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const fileKey = file.name // Use filename as key for progress tracking

    // Initialize progress
    setUploadProgress((prev) => new Map(prev).set(fileKey, 0))

    return new Promise((resolve, reject) => {
      // Get upload URL from Supabase
      supabase.storage
        .from('chat-attachments')
        .createSignedUploadUrl(fileName)
        .then(({ data, error }) => {
          if (error || !data) {
            setUploadProgress((prev) => {
              const next = new Map(prev)
              next.delete(fileKey)
              return next
            })
            reject(new Error(`Failed to create upload URL: ${error?.message}`))
            return
          }

          // Use XMLHttpRequest for progress tracking
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100)
              setUploadProgress((prev) => new Map(prev).set(fileKey, percentComplete))
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Upload successful, get public URL
              const {
                data: { publicUrl },
              } = supabase.storage.from('chat-attachments').getPublicUrl(fileName)

              // Clear progress after a short delay to show completion
              setTimeout(() => {
                setUploadProgress((prev) => {
                  const next = new Map(prev)
                  next.delete(fileKey)
                  return next
                })
              }, 500)

              resolve({
                name: file.name,
                url: publicUrl,
                size: file.size,
                type: file.type,
              })
            } else {
              setUploadProgress((prev) => {
                const next = new Map(prev)
                next.delete(fileKey)
                return next
              })
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            setUploadProgress((prev) => {
              const next = new Map(prev)
              next.delete(fileKey)
              return next
            })
            reject(new Error(`Failed to upload ${file.name}`))
          })

          xhr.open('PUT', data.signedUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })
        .catch((err) => {
          setUploadProgress((prev) => {
            const next = new Map(prev)
            next.delete(fileKey)
            return next
          })
          reject(err)
        })
    })
  }

  // Handle typing indicator
  const handleTyping = useCallback(async () => {
    try {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            sender: userId,
            typing: true,
          },
        })
      }
    } catch (error) {
      console.error('[ChatRoom] Error sending typing indicator:', error)
    }
  }, [userId])

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) {
      return
    }

    setSending(true)
    setError(null)

    // Stop typing indicator
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: userId, typing: false },
      })
    }

    try {
      // Upload attachments first
      let uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = []
      if (attachments.length > 0) {
        setUploading(true)
        uploadedFiles = await Promise.all(attachments.map((file) => uploadFile(file)))
        setUploading(false)
      }

      // Use API endpoint (supports both customers and mechanics)
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: trimmed || 'Attachment',
          attachments: uploadedFiles.length > 0 ? uploadedFiles : [],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      console.log('[ChatRoom] Message sent successfully:', data.message)

      // Add message to local state immediately so sender sees it
      if (data.message) {
        setMessages((prev) => {
          // Check for duplicate to prevent double-adding
          if (prev.some((m) => m.id === data.message.id)) {
            return prev
          }
          return [
            ...prev,
            {
              id: data.message.id,
              content: data.message.content,
              sender_id: data.message.sender_id,
              created_at: data.message.created_at,
              attachments: data.message.attachments || [],
              read_at: null, // New messages start unread
            },
          ]
        })
      }

      // Broadcast the message to all connected clients (including self)
      // CRITICAL FIX: Reuse existing channel instead of creating a new one to prevent socket leaks
      if (data.message && channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            message: {
              id: data.message.id,
              content: data.message.content,
              sender_id: data.message.sender_id,
              created_at: data.message.created_at,
              attachments: data.message.attachments || [],
              read_at: null, // New messages start unread
            },
          },
        })
        console.log('[ChatRoom] Broadcasted message via existing channel:', data.message.id)
      }

      setInput('')
      setAttachments([])

      // Keep focus on input after sending (especially important on mobile)
      // Use requestAnimationFrame + setTimeout for better mobile browser compatibility
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus({ preventScroll: true })
            messageInputRef.current.style.height = 'auto'
          }
        }, 50)
      })
    } catch (insertErr: any) {
      console.error('Send message error:', insertErr)
      setError(insertErr?.message ?? 'Unable to send message right now.')
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB
    const validFiles = files.filter((f) => {
      if (f.size > maxSize) {
        setError(`${f.name} is too large. Max size is 10MB.`)
        return false
      }
      return true
    })
    setAttachments((prev) => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Role-aware header status
  const headerStatus = isMechanic
    ? customerName
      ? `Chat with ${customerName}`
      : 'Chat with customer'
    : mechanicName
      ? `${mechanicName} has joined`
      : 'Waiting for mechanic...'

  const headerColor = isMechanic
    ? 'text-blue-600'
    : mechanicName
      ? 'text-green-600'
      : 'text-amber-600'

  async function handleExtendSession(minutes: number, priceInCents: number) {
    if (isFreeSession) {
      // Redirect to Stripe checkout for free sessions
      window.location.href = `/api/checkout/extend-session?session_id=${sessionId}&minutes=${minutes}&price=${priceInCents}`
      return
    }

    setExtendingSession(true)
    try {
      const response = await fetch('/api/sessions/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, minutes })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to extend session')

      setShowExtensionModal(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to extend session')
    } finally {
      setExtendingSession(false)
    }
  }

  // Helper: Fetch session data and show completion modal
  const fetchAndShowCompletionModal = useCallback(async () => {
    console.log('[CHAT] Fetching session data for completion modal...', { sessionId, userRole })

    try {
      // Fetch from role-specific API
      const apiPath = isMechanic ? '/api/mechanic/sessions' : '/api/customer/sessions'
      console.log('[CHAT] Fetching from:', apiPath)

      const response = await fetch(apiPath)
      console.log('[CHAT] API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[CHAT] API data received:', { sessionCount: data.sessions?.length })

        const session = data.sessions?.find((s: any) => s.id === sessionId)
        console.log('[CHAT] Session found:', session ? 'YES' : 'NO')

        if (session) {
          console.log('[CHAT] Showing completion modal with session:', session.id)
          setCompletionSessionData(session)
          setShowCompletionModal(true)
        } else {
          // Retry once after a short delay (session might not be fully persisted yet)
          console.warn('[CHAT] Session not found, retrying in 1 second...')
          setTimeout(async () => {
            try {
              const retryResponse = await fetch(apiPath)
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                const retrySession = retryData.sessions?.find((s: any) => s.id === sessionId)
                if (retrySession) {
                  console.log('[CHAT] Session found on retry!')
                  setCompletionSessionData(retrySession)
                  setShowCompletionModal(true)
                  return
                }
              }
            } catch (retryError) {
              console.error('[CHAT] Retry failed:', retryError)
            }
            console.warn('[CHAT] Session still not found after retry, redirecting...')
            window.location.href = dashboardUrl
          }, 1000)
        }
      } else {
        console.error('[CHAT] API returned error status:', response.status)
        const errorText = await response.text()
        console.error('[CHAT] Error response:', errorText)
        window.location.href = dashboardUrl
      }
    } catch (error) {
      console.error('[CHAT] Exception fetching session data:', error)
      window.location.href = dashboardUrl
    }
  }, [sessionId, dashboardUrl, isMechanic, userRole])

  async function handleEndSession() {
    setEndingSession(true)
    setShowEndSessionModal(false)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        console.log('[ChatRoom] Session ended successfully:', data)
        setSessionEnded(true)
        setCurrentStatus(data.session?.status || 'completed')

        // Show success notification
        toast.success('Session ended successfully', {
          duration: 2000,
          position: 'top-center',
        })

        // Show completion modal instead of redirecting
        await fetchAndShowCompletionModal()
      } else {
        console.error('[ChatRoom] Failed to end session:', data)
        throw new Error(data?.error || 'Failed to end session')
      }
    } catch (err: any) {
      console.error('[ChatRoom] End session error:', err)
      setError(err.message || 'Failed to end session')
      setEndingSession(false)
      // Show the modal again so user can retry
      setShowEndSessionModal(true)
    } finally {
      setEndingSession(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'text-sm sm:text-base',
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #475569',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header - Mobile First Design */}
      <header className="border-b border-slate-700/50 bg-slate-800/90 backdrop-blur-sm shadow-xl pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
          {/* Left: Back Button + Session Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Back Button - Larger for mobile */}
            <a
              href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
              className="flex h-11 w-11 sm:h-10 sm:w-auto items-center justify-center sm:justify-start sm:gap-2 rounded-lg sm:px-3 text-slate-300 transition hover:bg-slate-700/50 hover:text-white flex-shrink-0"
              title="Back to dashboard"
            >
              <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">Dashboard</span>
            </a>

            {/* Session Info - Compact on mobile */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-slate-700/30 rounded-lg px-2 sm:px-3 py-1.5 transition"
              title="Tap for session info"
            >
              <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg flex-shrink-0">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-semibold text-white truncate">
                    {isMechanic ? (
                      customerName || 'Customer'
                    ) : mechanicName && mechanicId ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMechanicProfileModal(true)
                        }}
                        className="hover:text-orange-300 hover:underline transition-colors text-left"
                        title="View mechanic profile"
                      >
                        {mechanicName}
                      </button>
                    ) : (
                      'Waiting for mechanic...'
                    )}
                  </h1>
                  {/* Real-time Presence Indicator */}
                  {bothParticipantsPresent && currentStatus?.toLowerCase() === 'live' && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium" title="Both participants online">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="hidden sm:inline">Online</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                  {/* Timer on mobile, status on desktop */}
                  {isTyping ? (
                    <span className="flex items-center gap-1.5 font-medium text-green-400">
                      <span className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce [animation-delay:0s]" />
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce [animation-delay:200ms]" />
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce [animation-delay:400ms]" />
                      </span>
                      <span className="text-[10px] sm:text-xs">typing</span>
                    </span>
                  ) : timeRemaining !== null && currentStatus?.toLowerCase() === 'live' ? (
                    <span className="flex items-center gap-1 font-medium text-blue-300">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                      <span className="hidden sm:inline text-slate-400 ml-1">• {planName}</span>
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1.5 font-medium ${headerColor}`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${(isMechanic || mechanicName) ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span className="truncate">{currentStatus === 'live' ? 'Live' : currentStatus === 'waiting' ? 'Waiting' : currentStatus || 'Pending'}</span>
                      <span className="hidden sm:inline text-slate-400">• {planName}</span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Right: Menu Only (Everything else goes inside) */}
          <div className="relative flex-shrink-0">
            {/* Mobile: Only show menu button */}
            <button
              onClick={() => setShowSessionMenu(!showSessionMenu)}
              className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-300 transition hover:bg-slate-700 hover:border-slate-500"
              title="Options"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Render menu via Portal to escape stacking context */}
            {showSessionMenu && isMounted && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowSessionMenu(false)} />
                <div className="fixed right-4 top-20 z-[9999] w-64 rounded-xl border border-slate-700/50 bg-slate-800 shadow-2xl">
                  <div className="p-2">
                    {/* Session Status Badge */}
                    <div className="px-4 py-2 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`inline-block h-2 w-2 rounded-full ${currentStatus === 'live' ? 'bg-green-500' : currentStatus === 'waiting' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                        <span className="text-white font-medium">
                          {currentStatus === 'live' ? 'Live Session' : currentStatus === 'waiting' ? 'Waiting for participant' : currentStatus || 'Pending'}
                        </span>
                      </div>
                      {isMechanic && (
                        <div className="mt-1 text-xs text-blue-300 font-medium">Mechanic View</div>
                      )}
                    </div>

                    <div className="my-1 h-px bg-slate-700" />

                    {/* Session Info Button */}
                    <button
                      onClick={() => {
                        setShowSessionMenu(false)
                        setShowSidebar(true)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                    >
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-left">Session Info & Details</span>
                    </button>

                    {/* Extend Session - Customers only, live sessions only */}
                    {!isMechanic && currentStatus?.toLowerCase() === 'live' && (
                      <button
                        onClick={() => {
                          setShowSessionMenu(false)
                          setShowExtensionModal(true)
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Extend Session Time
                      </button>
                    )}

                    {/* Dashboard Link */}
                    <a
                      href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Return to Dashboard
                    </a>

                    <div className="my-1 h-px bg-slate-700" />

                    {/* End Session Button */}
                    <button
                      onClick={() => {
                        setShowSessionMenu(false)
                        setShowEndSessionModal(true)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      End Session
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </header>

      {/* Collapsible Vehicle Info Bar */}
      {vehicleInfo && (
        <div className="border-b border-slate-700/50 bg-slate-800/70 backdrop-blur-sm">
          {/* Toggle Button */}
          <button
            onClick={() => setShowVehicleBar(!showVehicleBar)}
            className="flex w-full items-center justify-between px-3 sm:px-6 py-2 text-sm hover:bg-slate-700/30 transition"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-slate-300">
                {vehicleInfo.year && vehicleInfo.make && vehicleInfo.model
                  ? `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`
                  : 'Vehicle Info'}
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${showVehicleBar ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible Content */}
          {showVehicleBar && (
            <div className="px-3 sm:px-6 pb-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {vehicleInfo.vin && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-3 py-2">
                    <svg className="h-4 w-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500">VIN</p>
                      <p className="text-white font-mono truncate">{vehicleInfo.vin}</p>
                    </div>
                  </div>
                )}

                {vehicleInfo.license_plate && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-3 py-2">
                    <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500">License Plate</p>
                      <p className="text-white font-semibold">{vehicleInfo.license_plate}</p>
                    </div>
                  </div>
                )}

                {vehicleInfo.mileage && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-3 py-2">
                    <svg className="h-4 w-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500">Mileage</p>
                      <p className="text-white">{vehicleInfo.mileage.toLocaleString()} miles</p>
                    </div>
                  </div>
                )}

                {vehicleInfo.color && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-700/30 px-3 py-2">
                    <svg className="h-4 w-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500">Color</p>
                      <p className="text-white capitalize">{vehicleInfo.color}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Area - Full Screen on Mobile */}
      <main className="flex w-full flex-1 flex-col overflow-x-hidden overflow-y-visible px-3 sm:px-6 py-3 sm:py-6">
        {/* Join Notification */}
        {participantJoined && mechanicName && !isMechanic && (
          <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center backdrop-blur-sm animate-fade-in">
            <h3 className="text-lg font-bold text-green-300">
              {mechanicName} has joined the session
            </h3>
            <p className="mt-1 text-sm text-green-200">
              You can now start the conversation
            </p>
          </div>
        )}

        {/* Waiting for Participant Indicator */}
        {currentStatus === 'waiting' && !bothParticipantsPresent && (
          <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500/30 border-t-yellow-500"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-300">
                  {isMechanic
                    ? `Waiting for ${customerName || 'customer'} to join...`
                    : `Waiting for ${mechanicName || 'mechanic'} to join...`}
                </h3>
                <p className="mt-1 text-sm text-yellow-200">
                  {isMechanic
                    ? 'The timer will start when the customer enters the chat room'
                    : 'The timer will start when the mechanic enters the chat room'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Session Starting Notification */}
        {bothParticipantsPresent && currentStatus === 'waiting' && (
          <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-center backdrop-blur-sm animate-fade-in">
            <h3 className="text-lg font-bold text-green-300">
              Both participants joined - Session starting!
            </h3>
            <p className="mt-1 text-sm text-green-200">
              The timer is now active
            </p>
          </div>
        )}

        {sessionEnded && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center backdrop-blur-sm">
            <h3 className="text-lg font-bold text-red-300">
              {currentStatus === 'cancelled' ? 'Session Cancelled' : 'Session Ended'}
            </h3>
            <p className="mt-2 text-sm text-red-200">
              {currentStatus === 'cancelled'
                ? 'This session has been cancelled. The chat is now read-only.'
                : timeRemaining !== null && timeRemaining <= 0
                ? `Your ${sessionDurationMinutes}-minute session has expired. The chat is now read-only.`
                : 'This session has ended. The chat is now read-only.'}
            </p>
            <a
              href={dashboardUrl}
              className="mt-4 inline-block rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Return to Dashboard
            </a>
          </div>
        )}
        <div
          ref={messagesContainerRef}
          className="flex-1 flex flex-col-reverse space-y-reverse space-y-4 overflow-y-auto rounded-2xl bg-slate-800/50 p-3 sm:p-6 shadow-2xl border border-slate-700/50 backdrop-blur-sm relative"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 border border-orange-500/30">
                  <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Start the conversation</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {isMechanic
                    ? 'Say hello to the customer and ask how you can help.'
                    : 'Describe your issue and a mechanic will respond shortly.'}
                </p>
              </div>
            </div>
          ) : (
            // Reverse messages array for flex-col-reverse: newest at visual bottom
            [...messages].reverse().map((message) => {
              // Role-based alignment: mechanic always right, customer always left
              const isSenderMechanic = mechanicId && message.sender_id === mechanicId

              return (
                <div key={message.id} className={`flex ${isSenderMechanic ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] sm:max-w-lg gap-2 sm:gap-3 ${isSenderMechanic ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar - Smaller on mobile */}
                    <div
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        isSenderMechanic
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg'
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg'
                      } text-[10px] sm:text-xs font-bold text-white border-2 ${
                        isSenderMechanic ? 'border-orange-400/30' : 'border-blue-500/30'
                      }`}
                    >
                      {isSenderMechanic ? 'M' : 'C'}
                    </div>

                    {/* Message Bubble - Tighter padding on mobile */}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-lg ${
                          isSenderMechanic
                            ? 'rounded-tr-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white border border-orange-400/30'
                            : 'rounded-tl-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/30'
                        }`}
                      >
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                        )}

                        {/* Attachments - Inline images or file links */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                            {message.attachments.map((file, idx) => {
                              const isImage = file.type.startsWith('image/')

                              if (isImage) {
                                // Show image inline with click to expand - using lazy loading
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedImage(file.url)}
                                    className="block w-full rounded-lg overflow-hidden border border-white/20 hover:border-white/40 transition"
                                  >
                                    <LazyImage
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-auto max-h-64 object-cover"
                                    />
                                  </button>
                                )
                              } else {
                                // Show as file download link
                                return (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition ${
                                      isSenderMechanic
                                        ? 'border-orange-400/50 bg-orange-500/20 hover:bg-orange-500/30'
                                        : 'border-blue-500/50 bg-blue-600/20 hover:bg-blue-600/30'
                                    }`}
                                  >
                                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                      />
                                    </svg>
                                    <div className="flex-1 truncate">
                                      <p className="truncate font-medium">{file.name}</p>
                                      <p className={`text-xs ${isSenderMechanic ? 'text-orange-200' : 'text-blue-200'}`}>
                                        {formatFileSize(file.size)}
                                      </p>
                                    </div>
                                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                      />
                                    </svg>
                                  </a>
                                )
                              }
                            })}
                          </div>
                        )}
                      </div>

                      {/* Timestamp with Read Receipts */}
                      <div className={`flex items-center gap-1 px-1 ${isSenderMechanic ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className={`text-[10px] text-slate-500`}>
                          {formatTimestamp(message.created_at)}
                        </span>

                        {/* Read Receipts - Only show for own messages */}
                        {((userRole === 'mechanic' && isSenderMechanic) || (userRole === 'customer' && !isSenderMechanic)) && (
                          <span className="text-[10px] text-slate-400 flex items-center">
                            {message.read_at ? (
                              // Double checkmark for read messages
                              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M0.5 8.5l1.5 1.5 3-3-1.5-1.5-3 3zm5 0l1.5 1.5 8-8-1.5-1.5-8 8z" />
                                <path d="M3.5 8.5l1.5 1.5 8-8-1.5-1.5-8 8z" opacity="0.6" />
                              </svg>
                            ) : (
                              // Single checkmark for sent messages
                              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3.5 8.5l1.5 1.5 8-8-1.5-1.5-8 8z" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to Bottom Button - Floating */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-4 sm:right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-2xl transition hover:bg-orange-600 active:scale-95"
            title="Scroll to bottom"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {/* Input Area - Mobile Optimized with Safe Area */}
        <form onSubmit={handleSend} className="mt-3 sm:mt-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 sm:p-4 shadow-2xl backdrop-blur-sm pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          {/* File Previews - Enhanced with Image Thumbnails */}
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments([])}
                  className="text-xs text-slate-500 hover:text-red-400 transition"
                >
                  Clear all
                </button>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {attachments.map((file, idx) => {
                  const isImage = file.type.startsWith('image/')
                  const isPDF = file.type === 'application/pdf'
                  const isDoc = file.type.includes('word') || file.type.includes('document') || file.name.endsWith('.doc') || file.name.endsWith('.docx')

                  return (
                    <div
                      key={idx}
                      className="relative group rounded-lg border border-slate-600/50 bg-slate-700/50 overflow-hidden hover:border-slate-500 transition"
                    >
                      {/* Remove button - Always visible on mobile, hover on desktop */}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-red-600"
                        title="Remove file"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Preview */}
                      <div className="aspect-square w-full">
                        {isImage ? (
                          // Image thumbnail
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                          />
                        ) : (
                          // File icon for non-images
                          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800/50 p-3">
                            {isPDF ? (
                              <svg className="h-12 w-12 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9L13,3.5V9H18.5Z" />
                              </svg>
                            ) : isDoc ? (
                              <svg className="h-12 w-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9L13,3.5V9H18.5M7,13V11H9V13H7M11,13V11H17V13H11M7,17V15H9V17H7M11,17V15H17V17H11Z" />
                              </svg>
                            ) : (
                              <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="p-2 bg-slate-800/70">
                        <p className="text-xs font-medium text-slate-300 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(file.size)}
                        </p>

                        {/* Upload Progress Bar */}
                        {uploadProgress.has(file.name) && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-orange-400 font-medium">Uploading...</span>
                              <span className="text-slate-400">{uploadProgress.get(file.name)}%</span>
                            </div>
                            <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress.get(file.name)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Input Area - WhatsApp-style with full-width textbox and compact buttons */}
          <div className="relative">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.txt"
            />

            {/* Main Input Container - WhatsApp Style: Single cohesive box with all buttons integrated */}
            <div className="flex items-end gap-2 rounded-2xl border border-slate-600/50 bg-slate-700/50 px-3 py-2 transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
              {/* Left Buttons - Inside the box */}
              <div className="flex items-center gap-1.5 pb-0.5">
                {/* Camera Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment')
                      fileInputRef.current.setAttribute('accept', 'image/*')
                      fileInputRef.current.removeAttribute('multiple')
                      fileInputRef.current.click()
                      setTimeout(() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute('capture')
                          fileInputRef.current.setAttribute('accept', 'image/*,application/pdf,.doc,.docx,.txt')
                          fileInputRef.current.setAttribute('multiple', 'true')
                        }
                      }, 100)
                    }
                  }}
                  disabled={sending || uploading || sessionEnded}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-600/50 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Take photo"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture')
                      fileInputRef.current.setAttribute('accept', 'image/*,application/pdf,.doc,.docx,.txt')
                      fileInputRef.current.setAttribute('multiple', 'true')
                      fileInputRef.current.click()
                    }
                  }}
                  disabled={sending || uploading || sessionEnded}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-600/50 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Attach file"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
              </div>

              {/* Textarea - Borderless, fills remaining space */}
              <textarea
                ref={messageInputRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  handleTyping()
                  event.target.style.height = 'auto'
                  event.target.style.height = Math.min(event.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    const form = event.currentTarget.form as HTMLFormElement | null
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                  }
                }}
                placeholder={sessionEnded ? "Session has ended" : "Type your message..."}
                rows={1}
                maxLength={2000}
                style={{ maxHeight: '120px' }}
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder-slate-400 outline-none disabled:cursor-not-allowed"
                disabled={sending || uploading || sessionEnded}
              />

              {/* Send Button - Inside the box on the right */}
              <div className="flex items-center pb-0.5">
                <button
                  type="submit"
                  disabled={sending || uploading || sessionEnded || (!input.trim() && attachments.length === 0)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send message"
                >
                  {sending || uploading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Character Count - Below the input box */}
            <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-xs text-slate-500 px-1">
              <span>{input.length} / 2000</span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}
        </form>
      </main>

      {/* Sidebar - Mobile Drawer with Animation */}
      {showSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowSidebar(false)}
          />

          {/* Drawer - Slides in from right with swipe gesture */}
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-[85vw] max-w-sm bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto animate-slide-in-right transition-transform touch-none"
            style={{
              transform: sidebarSwipeOffset > 0 ? `translateX(${sidebarSwipeOffset}px)` : 'none',
            }}
            onTouchStart={handleSidebarTouchStart}
            onTouchMove={handleSidebarTouchMove}
            onTouchEnd={handleSidebarTouchEnd}
          >
            {/* Sidebar Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-800 p-4">
              <h2 className="text-base sm:text-lg font-semibold text-white">Session Info</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white h-11 w-11 flex items-center justify-center"
                title="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          <div className="p-4 space-y-6">
            {/* CRITICAL: Customer's Problem Description - Show FIRST for mechanics */}
            {isMechanic && intakeData && intakeData.concern && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="font-semibold text-red-300">Customer's Issue</h3>
                </div>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{intakeData.concern}</p>

                {/* Intake form images/files */}
                {intakeData.files && intakeData.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Attached Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {intakeData.files.map((file: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(file)}
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 hover:border-orange-400 transition group"
                        >
                          <img
                            src={file}
                            alt={`Intake ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {intakeData.urgent && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500/20 border border-orange-500/30 px-3 py-2">
                    <svg className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-orange-300">URGENT SESSION</span>
                  </div>
                )}
              </div>
            )}

            {/* Mechanic Profile Card - Only for customers */}
            {!isMechanic && mechanicProfile && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-lg">
                    {mechanicProfile.name?.charAt(0) || 'M'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{mechanicProfile.name || 'Mechanic'}</h3>
                    {mechanicProfile.rating && (
                      <div className="flex items-center gap-1 text-xs text-yellow-400">
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span>{mechanicProfile.rating.toFixed(1)}</span>
                        {mechanicProfile.total_sessions && (
                          <span className="text-slate-400">({mechanicProfile.total_sessions} sessions)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* About Me */}
                {mechanicProfile.about_me && (
                  <div className="mt-3 rounded-lg bg-slate-900/50 p-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">About</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{mechanicProfile.about_me}</p>
                  </div>
                )}

                {/* Specializations */}
                {mechanicProfile.specializations && mechanicProfile.specializations.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Specializations</h4>
                    <div className="flex flex-wrap gap-2">
                      {mechanicProfile.specializations.map((spec: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded-full bg-orange-500/20 border border-orange-500/30 px-3 py-1 text-xs text-orange-300"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Information */}
            {vehicleInfo && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <h3 className="font-semibold text-white">Vehicle Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {vehicleInfo.year && vehicleInfo.make && vehicleInfo.model && (
                    <div>
                      <span className="text-slate-400">Vehicle:</span>
                      <span className="ml-2 text-white font-medium">
                        {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                      </span>
                    </div>
                  )}
                  {vehicleInfo.vin && (
                    <div>
                      <span className="text-slate-400">VIN:</span>
                      <span className="ml-2 text-white font-mono text-xs">{vehicleInfo.vin}</span>
                    </div>
                  )}
                  {vehicleInfo.license_plate && (
                    <div>
                      <span className="text-slate-400">License Plate:</span>
                      <span className="ml-2 text-white font-medium">{vehicleInfo.license_plate}</span>
                    </div>
                  )}
                  {vehicleInfo.mileage && (
                    <div>
                      <span className="text-slate-400">Mileage:</span>
                      <span className="ml-2 text-white">{vehicleInfo.mileage.toLocaleString()} miles</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shared Files */}
            {messages.some(m => m.attachments && m.attachments.length > 0) && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="font-semibold text-white">Shared Files</h3>
                </div>
                <div className="space-y-2">
                  {messages
                    .flatMap(m => m.attachments || [])
                    .filter((file, index, self) =>
                      index === self.findIndex(f => f.url === file.url)
                    )
                    .map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm transition hover:bg-slate-800"
                      >
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium text-white">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Session Details */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-white">Session Details</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Plan:</span>
                  <span className="ml-2 text-white font-medium">{planName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duration:</span>
                  <span className="ml-2 text-white">{sessionDurationMinutes} minutes</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className="ml-2 text-white capitalize">{currentStatus || 'pending'}</span>
                </div>
                {currentStartedAt && (
                  <div>
                    <span className="text-slate-400">Started:</span>
                    <span className="ml-2 text-white">
                      {new Date(currentStartedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Extend Your Session</h3>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 transition hover:text-slate-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-6 text-sm text-slate-400">
              {isFreeSession
                ? 'Choose additional time for your session. You\'ll be redirected to payment.'
                : 'Choose how much time you\'d like to add to your current session.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExtendSession(15, 1499)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-700/50 p-4 text-left transition hover:border-orange-500/50 hover:bg-orange-500/10 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-white">15 Minutes</p>
                  <p className="text-sm text-slate-400">Quick extension</p>
                </div>
                <span className="text-lg font-bold text-orange-400">$14.99</span>
              </button>

              <button
                onClick={() => handleExtendSession(30, 2499)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-700/50 p-4 text-left transition hover:border-orange-500/50 hover:bg-orange-500/10 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-white">30 Minutes</p>
                  <p className="text-sm text-slate-400">Standard extension</p>
                </div>
                <span className="text-lg font-bold text-orange-400">$24.99</span>
              </button>

              <button
                onClick={() => handleExtendSession(60, 3999)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-xl border-2 border-orange-500/50 bg-orange-500/10 p-4 text-left transition hover:border-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-white">60 Minutes</p>
                  <p className="text-sm text-orange-400">Best value!</p>
                </div>
                <span className="text-lg font-bold text-orange-400">$39.99</span>
              </button>
            </div>

            {extendingSession && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Redirecting Overlay */}
      {sessionEnded && endingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-green-500/30 bg-slate-800 p-8 shadow-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border-2 border-green-500/50">
                <svg className="h-8 w-8 text-green-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Session Ended</h3>
            <p className="text-slate-400 mb-4">Redirecting to your dashboard...</p>
            <div className="flex justify-center">
              <div className="h-1 w-32 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">
                  {currentStatus?.toLowerCase() === 'live' ? 'End Session?' : 'Cancel Session?'}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {currentStatus?.toLowerCase() === 'live'
                    ? 'Are you sure you want to end this session? This action cannot be undone and the chat will be marked as completed.'
                    : currentStatus?.toLowerCase() === 'waiting'
                    ? 'This session is waiting for a mechanic to join. Ending it now will cancel the session request.'
                    : 'This session has not started yet. Ending it now will cancel the session.'}
                </p>

                {/* Show presence indicator */}
                {bothParticipantsPresent && currentStatus?.toLowerCase() === 'live' && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-amber-200">
                      {isMechanic
                        ? `${customerName || 'Customer'} is currently in the session`
                        : `${mechanicName || 'Mechanic'} is currently in the session`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Show time warning only for live sessions with time remaining */}
            {!isMechanic && currentStatus?.toLowerCase() === 'live' && timeRemaining !== null && timeRemaining > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-300">Time Remaining</p>
                    <p className="mt-1 text-sm text-amber-200">
                      You still have {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')} left in your session. Ending now will forfeit the remaining time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show info for pending/waiting sessions */}
            {['pending', 'waiting'].includes(currentStatus?.toLowerCase() || '') && (
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-300">Session Not Started</p>
                    <p className="mt-1 text-sm text-blue-200">
                      {currentStatus?.toLowerCase() === 'waiting'
                        ? 'Since no mechanic has joined yet, this will be cancelled instead of completed.'
                        : 'This session will be cancelled as it has not started yet.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                onClick={handleEndSession}
                disabled={endingSession}
                className="flex-1 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {endingSession
                  ? (currentStatus?.toLowerCase() === 'live' ? 'Ending Session...' : 'Cancelling...')
                  : (currentStatus?.toLowerCase() === 'live' ? 'Yes, End Session' : 'Yes, Cancel Session')
                }
              </button>
              <button
                onClick={() => setShowEndSessionModal(false)}
                disabled={endingSession}
                className="flex-1 rounded-full border border-slate-600 bg-slate-700/50 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
              >
                {currentStatus?.toLowerCase() === 'live' ? 'Keep Session Active' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Viewer with Zoom/Pan */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden touch-none"
          onClick={closeImageModal}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
        >
          {/* Close Button */}
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white transition hover:bg-slate-700 backdrop-blur-sm"
            title="Close (ESC)"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoom Indicator */}
          {imageZoom !== 1 && (
            <div className="absolute top-4 left-4 z-20 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              {Math.round(imageZoom * 100)}%
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-slate-800/80 px-4 py-2 text-xs text-slate-300 backdrop-blur-sm">
            <span className="hidden sm:inline">Scroll to zoom • </span>
            <span className="sm:hidden">Pinch to zoom • </span>
            Double-click to reset
          </div>

          {/* Image Container */}
          <div
            className="relative flex items-center justify-center w-full h-full select-none"
            onWheel={handleImageWheel}
            onTouchStart={handleImageTouchStart}
            onTouchMove={handleImageTouchMove}
            onTouchEnd={handleImageTouchEnd}
            onMouseDown={handleImageMouseDown}
            onDoubleClick={handleImageDoubleClick}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
          >
            <img
              src={selectedImage}
              alt="Full size"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl select-none pointer-events-none"
              style={{
                transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Mechanic Profile Modal */}
      {mechanicId && (
        <MechanicProfileModal
          mechanicId={mechanicId}
          isOpen={showMechanicProfileModal}
          onClose={() => setShowMechanicProfileModal(false)}
        />
      )}

      {/* Session Completion Modal */}
      {completionSessionData && (
        <SessionCompletionModal
          isOpen={showCompletionModal}
          sessionData={completionSessionData}
          onClose={() => setShowCompletionModal(false)}
          onViewDashboard={() => {
            window.location.href = dashboardUrl
          }}
          onViewDetails={() => {
            window.location.href = isMechanic
              ? '/mechanic/sessions'
              : '/customer/sessions'
          }}
          userRole={isMechanic ? 'mechanic' : 'customer'}
        />
      )}
    </div>
  )
}
