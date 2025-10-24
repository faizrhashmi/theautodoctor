'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ChatMessage } from '@/types/supabase'
import type { PlanKey } from '@/config/pricing'

type Message = Pick<ChatMessage, 'id' | 'content' | 'created_at' | 'sender_id'> & {
  attachments?: Array<{ name: string; url: string; size: number; type: string }>
}

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
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  // Fetch updated participant info when session loads
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
        }
      } catch (err) {
        console.error('Failed to fetch session info:', err)
      }
    }
    fetchSessionInfo()
  }, [sessionId, mechanicName, customerName])

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

  // Timer countdown logic
  useEffect(() => {
    if (currentStatus?.toLowerCase() !== 'live' || !currentStartedAt) return

    const startTime = new Date(currentStartedAt).getTime()
    const durationMs = sessionDurationMinutes * 60 * 1000

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - startTime
      const remaining = Math.max(0, durationMs - elapsed)

      setTimeRemaining(Math.ceil(remaining / 1000)) // in seconds

      // Session expired
      if (remaining <= 0 && !sessionEnded) {
        setSessionEnded(true)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, currentStatus, currentStartedAt, sessionDurationMinutes, sessionEnded, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscriptions
  useEffect(() => {
    console.log('[ChatRoom] Setting up real-time subscription for session:', sessionId)

    const channel = supabase
      .channel(`session-${sessionId}`, {
        config: {
          broadcast: { self: true }, // Receive own messages for debugging
        },
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
                sender_id: msg.sender_id,
                attachments: msg.attachments || [],
              },
            ]
          })
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

          // Show notification when session ends
          if ((oldStatus === 'live' || oldStatus === 'waiting') &&
              (updated.status === 'completed' || updated.status === 'cancelled')) {
            const endedBy = isMechanic ? 'mechanic' : 'customer'
            console.log(`[ChatRoom] Session ended by ${endedBy}`)
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

    return () => {
      console.log('[ChatRoom] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, mechanicName])

  async function uploadFile(file: File): Promise<{ name: string; url: string; size: number; type: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(fileName)

    return {
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) {
      return
    }

    setSending(true)
    setError(null)

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
          content: trimmed || '📎 Attachment',
          attachments: uploadedFiles.length > 0 ? uploadedFiles : [],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      console.log('[ChatRoom] Message sent successfully:', data.message)

      // Broadcast the message to all connected clients (including self)
      if (data.message) {
        const channel = supabase.channel(`session-${sessionId}`)
        await channel.subscribe()
        await channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            message: {
              id: data.message.id,
              content: data.message.content,
              sender_id: data.message.sender_id,
              created_at: data.message.created_at,
              attachments: data.message.attachments || [],
            },
          },
        })
        console.log('[ChatRoom] Broadcasted message:', data.message.id)
      }

      setInput('')
      setAttachments([])
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

        // Redirect immediately to dashboard based on role
        const dashboardUrl = isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'
        console.log('[ChatRoom] Redirecting to:', dashboardUrl)
        window.location.href = dashboardUrl
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
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/90 backdrop-blur-sm shadow-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <a
              href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 hover:text-white"
              title="Back to dashboard"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </a>

            <div className="h-8 w-px bg-slate-700" />

            {/* Session Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">{planName}</h1>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${headerColor}`}>
                  <span className={`inline-block h-2 w-2 rounded-full ${(isMechanic || mechanicName) ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                  {headerStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Timer */}
            {timeRemaining !== null && currentStatus?.toLowerCase() === 'live' && (
              <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300 border border-blue-500/30">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>
            )}

            {/* Status Badge */}
            <span className="rounded-full bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-600/50">
              {currentStatus === 'live' ? '🟢 Live' : currentStatus === 'waiting' ? '🟡 Waiting' : `⚪ ${currentStatus || 'pending'}`}
            </span>

            {/* Mechanic Badge */}
            {isMechanic && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300 border border-blue-500/30">
                Mechanic
              </span>
            )}

            {/* End Session Button - Always Visible */}
            <button
              onClick={() => setShowEndSessionModal(true)}
              className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20 hover:border-red-500"
              title="End this session"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">End Session</span>
            </button>

            {/* Session Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSessionMenu(!showSessionMenu)}
                className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:border-slate-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span className="hidden sm:inline">Options</span>
              </button>

              {showSessionMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSessionMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-700/50 bg-slate-800 shadow-2xl">
                    <div className="p-2">
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
                      <a
                        href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        View Dashboard
                      </a>
                      <div className="my-1 h-px bg-slate-700" />
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-x-hidden overflow-y-visible px-6 py-6">
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

        {/* DEBUG BANNER - Remove after fixing role issue */}
        <div className="mb-4 rounded-lg border border-purple-500/50 bg-purple-500/10 p-3 text-xs font-mono">
          <div className="font-bold text-purple-300 mb-2">🔍 Debug Info (remove in production):</div>
          <div className="space-y-1 text-purple-200">
            <div>userRole: <span className="text-purple-100 font-bold">{userRole}</span></div>
            <div>isMechanic: <span className="text-purple-100 font-bold">{String(isMechanic)}</span></div>
            <div>userId: <span className="text-purple-100">{userId}</span></div>
            <div>mechanicId: <span className="text-purple-100">{mechanicId || 'null'}</span></div>
            <div>customerId: <span className="text-purple-100">{customerId || 'null'}</span></div>
            <div>mechanicPresent: <span className={mechanicPresent ? "text-green-300 font-bold" : "text-red-300 font-bold"}>{String(mechanicPresent)}</span></div>
            <div>customerPresent: <span className={customerPresent ? "text-green-300 font-bold" : "text-red-300 font-bold"}>{String(customerPresent)}</span></div>
            <div className="mt-2 pt-2 border-t border-purple-500/30">
              <div className="text-purple-300 font-semibold">Expected IDs to match:</div>
              <div>My userId === {userRole === 'mechanic' ? 'mechanicId' : 'customerId'}?</div>
              <div className={userId === (userRole === 'mechanic' ? mechanicId : customerId) ? "text-green-300" : "text-red-300 font-bold"}>
                {userId === (userRole === 'mechanic' ? mechanicId : customerId) ? '✓ IDs Match' : '✗ IDs DO NOT MATCH!'}
              </div>
            </div>
          </div>
        </div>

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
        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-slate-800/50 p-6 shadow-2xl border border-slate-700/50 backdrop-blur-sm">
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
            messages.map((message) => {
              // Role-based alignment: mechanic always right, customer always left
              const isSenderMechanic = mechanicId && message.sender_id === mechanicId

              return (
                <div key={message.id} className={`flex ${isSenderMechanic ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-2xl gap-3 ${isSenderMechanic ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        isSenderMechanic
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg'
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg'
                      } text-xs font-bold text-white border-2 ${
                        isSenderMechanic ? 'border-orange-400/30' : 'border-blue-500/30'
                      }`}
                    >
                      {isSenderMechanic ? 'M' : 'C'}
                    </div>

                    {/* Message Bubble */}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-lg ${
                          isSenderMechanic
                            ? 'rounded-tr-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white border border-orange-400/30'
                            : 'rounded-tl-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/30'
                        }`}
                      >
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                        )}

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                            {message.attachments.map((file, idx) => (
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
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`px-1 text-[10px] text-slate-500 ${isSenderMechanic ? 'text-right' : 'text-left'}`}>
                        {formatTimestamp(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 shadow-2xl backdrop-blur-sm">
          {/* File Previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-xs"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="max-w-xs truncate font-medium text-slate-300">{file.name}</span>
                  <span className="text-slate-500">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="ml-1 text-slate-500 hover:text-red-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    const form = event.currentTarget.form as HTMLFormElement | null
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                  }
                }}
                placeholder={sessionEnded ? "Session has ended" : "Type your message... (Shift+Enter for new line)"}
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-slate-600/50 bg-slate-700/50 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                disabled={sending || uploading || sessionEnded}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{input.length} / 2000</span>
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || uploading || sessionEnded}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-700/50 text-slate-300 transition hover:bg-slate-700 hover:text-orange-400 hover:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50"
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
              <button
                type="submit"
                disabled={sending || uploading || sessionEnded || (!input.trim() && attachments.length === 0)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                title="Send message"
              >
                {sending || uploading ? (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
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
    </div>
  )
}
