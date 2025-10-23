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
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
    } else {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(date)
    }
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
}: Omit<ChatRoomProps, 'userEmail' | 'scheduledStart' | 'scheduledEnd' | 'initialParticipants' | 'planName'>) {
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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const prevMessagesLengthRef = useRef(messages.length)

  const isMechanic = userRole === 'mechanic'
  const bothParticipantsPresent = mechanicPresent && customerPresent

  // Calculate session duration in minutes
  const sessionDurationMinutes = useMemo(() => {
    if (plan === 'free' || plan === 'trial' || plan === 'trial-free') {
      return 5
    }

    const planKey = plan as PlanKey
    if (planKey === 'chat10') return 30
    if (planKey === 'video15') return 45
    if (planKey === 'diagnostic') return 60

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

          if (data.mechanicId) {
            setMechanicId(data.mechanicId)
          }
          if (data.customerId) {
            setCustomerId(data.customerId)
          }

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

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        console.log('[ChatRoom] Presence sync:', state)

        const mechanicIsPresent = Object.keys(state).some(key => key === mechanicId)
        const customerIsPresent = Object.keys(state).some(key => key === customerId)

        setMechanicPresent(mechanicIsPresent)
        setCustomerPresent(customerIsPresent)

        console.log('[ChatRoom] Presence status:', { mechanicIsPresent, customerIsPresent })
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[ChatRoom] User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[ChatRoom] User left:', key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            role: userRole,
            online_at: new Date().toISOString(),
          })
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

      setTimeRemaining(Math.ceil(remaining / 1000))

      if (remaining <= 0 && !sessionEnded) {
        setSessionEnded(true)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, currentStatus, currentStartedAt, sessionDurationMinutes, sessionEnded, supabase])

  // Smart auto-scroll: only scroll if user is near bottom
  useEffect(() => {
    if (messages.length <= prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = messages.length
      return
    }

    const container = messagesContainerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    prevMessagesLengthRef.current = messages.length
  }, [messages])

  // Real-time subscriptions
  useEffect(() => {
    console.log('[ChatRoom] Setting up real-time subscription for session:', sessionId)

    const channel = supabase
      .channel(`session-${sessionId}`, {
        config: {
          broadcast: { self: true },
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

          if (updated.started_at) {
            setCurrentStartedAt(updated.started_at)
          }

          if ((oldStatus === 'live' || oldStatus === 'waiting') &&
              (updated.status === 'completed' || updated.status === 'cancelled')) {
            const endedBy = isMechanic ? 'mechanic' : 'customer'
            console.log(`[ChatRoom] Session ended by ${endedBy}`)
          }

          if (updated.mechanic_id && !mechanicId) {
            setMechanicId(updated.mechanic_id)
            try {
              const response = await fetch(`/api/chat/session-info?sessionId=${sessionId}`)
              if (response.ok) {
                const data = await response.json()
                const name = data.mechanicName || 'Mechanic'
                setMechanicName(name)

                if (!isMechanic) {
                  setParticipantJoined(true)
                  setTimeout(() => setParticipantJoined(false), 5000)
                }
              }
            } catch (err) {
              console.error('Failed to fetch mechanic name:', err)
            }
          }

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
      let uploadedFiles: Array<{ name: string; url: string; size: number; type: string }> = []
      if (attachments.length > 0) {
        setUploading(true)
        uploadedFiles = await Promise.all(attachments.map((file) => uploadFile(file)))
        setUploading(false)
      }

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
      Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls({})
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
    const maxSize = 10 * 1024 * 1024
    const validFiles = files.filter((f) => {
      if (f.size > maxSize) {
        setError(`${f.name} is too large. Max size is 10MB.`)
        return false
      }
      return true
    })

    const newPreviews: Record<string, string> = {}
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        newPreviews[file.name] = URL.createObjectURL(file)
      }
    })

    setPreviewUrls(prev => ({ ...prev, ...newPreviews }))
    setAttachments((prev) => [...prev, ...validFiles])
    setShowAttachmentMenu(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(index: number) {
    const file = attachments[index]
    if (!file) return

    const previewUrl = previewUrls[file.name]
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrls(prev => {
        const next = { ...prev }
        delete next[file.name]
        return next
      })
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const otherParticipantName = isMechanic ? customerName : mechanicName
  const isOtherParticipantOnline = isMechanic ? customerPresent : mechanicPresent

  async function handleExtendSession(minutes: number, priceInCents: number) {
    if (isFreeSession) {
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
      setShowEndSessionModal(true)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-50">
      {/* WhatsApp-Style Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <a
              href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              title="Back to dashboard"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>

            {/* Participant Avatar & Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-bold text-white">
                  {otherParticipantName ? otherParticipantName[0]?.toUpperCase() : (isMechanic ? 'C' : 'M')}
                </div>
                {isOtherParticipantOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
                )}
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">
                  {otherParticipantName || (isMechanic ? 'Customer' : 'Mechanic')}
                </h1>
                <p className="text-xs text-slate-500">
                  {isOtherParticipantOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Timer */}
            {timeRemaining !== null && currentStatus?.toLowerCase() === 'live' && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>
            )}

            {/* Options Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSessionMenu(!showSessionMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showSessionMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSessionMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                    <div className="py-1">
                      {!isMechanic && currentStatus?.toLowerCase() === 'live' && (
                        <button
                          onClick={() => {
                            setShowSessionMenu(false)
                            setShowExtensionModal(true)
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Extend Time
                        </button>
                      )}
                      <a
                        href={isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </a>
                      <div className="my-1 h-px bg-slate-200" />
                      <button
                        onClick={() => {
                          setShowSessionMenu(false)
                          setShowEndSessionModal(true)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <main className="flex-1 overflow-hidden bg-slate-50">
        <div className="mx-auto h-full max-w-5xl px-4">
          {/* Join Notification */}
          {participantJoined && mechanicName && !isMechanic && (
            <div className="mb-3 mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-sm font-medium text-green-900">
                {mechanicName} has joined the session
              </p>
            </div>
          )}

          {/* Waiting Indicator */}
          {currentStatus === 'waiting' && !bothParticipantsPresent && (
            <div className="mb-3 mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
                <p className="text-sm font-medium text-amber-900">
                  Waiting for {isMechanic ? customerName || 'customer' : mechanicName || 'mechanic'} to join...
                </p>
              </div>
            </div>
          )}

          {/* Session Starting */}
          {bothParticipantsPresent && currentStatus === 'waiting' && (
            <div className="mb-3 mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-sm font-medium text-green-900">
                Both participants joined - Session starting!
              </p>
            </div>
          )}

          {/* Session Ended */}
          {sessionEnded && (
            <div className="mb-3 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-center">
              <h3 className="text-sm font-bold text-red-900">
                {currentStatus === 'cancelled' ? 'Session Cancelled' : 'Session Ended'}
              </h3>
              <p className="mt-1 text-xs text-red-700">The chat is now read-only.</p>
              <a
                href={dashboardUrl}
                className="mt-2 inline-block rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Return to Dashboard
              </a>
            </div>
          )}

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            className="h-[calc(100vh-280px)] overflow-y-auto py-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">No messages yet</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {isMechanic ? 'Say hello to the customer' : 'Start the conversation'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isFromMechanic = mechanicId && message.sender_id === mechanicId
                  const isOwnMessage = message.sender_id === userId

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-md gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Message Bubble - Customer: Blue, Mechanic: Gray */}
                        <div className="flex flex-col gap-1">
                          <div
                            className={`rounded-lg px-3 py-2 shadow-sm ${
                              isFromMechanic
                                ? 'bg-slate-200 text-slate-900'
                                : 'bg-blue-500 text-white'
                            } ${isOwnMessage ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                          >
                            {message.content && (
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {message.content}
                              </p>
                            )}

                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                                {message.attachments.map((file, idx) => (
                                  <div key={idx}>
                                    {file.type.startsWith('image/') ? (
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={file.url}
                                          alt={file.name}
                                          className="max-w-xs rounded-lg"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition ${
                                          isFromMechanic
                                            ? 'border-slate-300 bg-slate-100 hover:bg-slate-50'
                                            : 'border-blue-400 bg-blue-400/20 hover:bg-blue-400/30'
                                        }`}
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <div className="flex-1 truncate">
                                          <p className="truncate font-medium">{file.name}</p>
                                          <p className={`text-xs ${isFromMechanic ? 'text-slate-600' : 'text-blue-100'}`}>
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
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Timestamp */}
                          <span className={`px-1 text-[10px] text-slate-400 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* WhatsApp-Style Input Area */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <form onSubmit={handleSend}>
            {/* File Previews */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative">
                    {file.type.startsWith('image/') && previewUrls[file.name] ? (
                      <div className="relative">
                        <img
                          src={previewUrls[file.name]}
                          alt={file.name}
                          className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-xs">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="max-w-xs truncate font-medium text-slate-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-2">
              {/* Attachment Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  disabled={sessionEnded}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {showAttachmentMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAttachmentMenu(false)} />
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                      <div className="py-1">
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
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Photos & Files
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Text Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={sessionEnded ? "Session ended" : "Type a message..."}
                  maxLength={2000}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  disabled={sending || uploading || sessionEnded}
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={sending || uploading || sessionEnded || (!input.trim() && attachments.length === 0)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Error Message */}
            {error && (
              <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>
      </footer>

      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Extend Your Session</h3>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-6 text-sm text-slate-600">
              {isFreeSession
                ? 'Choose additional time for your session. You will be redirected to payment.'
                : 'Choose how much time you would like to add to your current session.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExtendSession(15, 1499)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">15 Minutes</p>
                  <p className="text-sm text-slate-500">Quick extension</p>
                </div>
                <span className="text-lg font-bold text-blue-600">$14.99</span>
              </button>

              <button
                onClick={() => handleExtendSession(30, 2499)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">30 Minutes</p>
                  <p className="text-sm text-slate-500">Standard extension</p>
                </div>
                <span className="text-lg font-bold text-blue-600">$24.99</span>
              </button>

              <button
                onClick={() => handleExtendSession(60, 3999)}
                disabled={extendingSession}
                className="flex w-full items-center justify-between rounded-lg border-2 border-blue-500 bg-blue-50 p-4 text-left transition hover:bg-blue-100 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">60 Minutes</p>
                  <p className="text-sm text-blue-600">Best value!</p>
                </div>
                <span className="text-lg font-bold text-blue-600">$39.99</span>
              </button>
            </div>

            {extendingSession && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
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

      {/* End Session Modal */}
      {showEndSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">
                  {currentStatus?.toLowerCase() === 'live' ? 'End Session?' : 'Cancel Session?'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {currentStatus?.toLowerCase() === 'live'
                    ? 'Are you sure you want to end this session? This action cannot be undone.'
                    : 'This session has not started yet. Ending it now will cancel the session.'}
                </p>
              </div>
            </div>

            {!isMechanic && currentStatus?.toLowerCase() === 'live' && timeRemaining !== null && timeRemaining > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Time Remaining</p>
                <p className="mt-1 text-sm text-amber-700">
                  You still have {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')} left.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                onClick={handleEndSession}
                disabled={endingSession}
                className="flex-1 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {endingSession
                  ? (currentStatus?.toLowerCase() === 'live' ? 'Ending...' : 'Cancelling...')
                  : (currentStatus?.toLowerCase() === 'live' ? 'Yes, End Session' : 'Yes, Cancel')}
              </button>
              <button
                onClick={() => setShowEndSessionModal(false)}
                disabled={endingSession}
                className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redirecting Overlay */}
      {sessionEnded && endingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 animate-pulse text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">Session Ended</h3>
            <p className="mb-4 text-slate-600">Redirecting to your dashboard...</p>
            <div className="flex justify-center">
              <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-full animate-pulse bg-green-600"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
