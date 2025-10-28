'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Minimize2, Send, Paperclip, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'
import SessionTimer from './SessionTimer'

interface ChatPopupProps {
  sessionId: string
  sessionType: 'chat' | 'video' | 'diagnostic'
  userEmail: string
  onClose: () => void
}

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row']
type SessionParticipantRow = Database['public']['Tables']['session_participants']['Row']

type Attachment = {
  name?: string | null
  url?: string | null
  [key: string]: Json | undefined
}

interface Message {
  id: string
  session_id: string
  sender_id: string | null
  sender_email: string | null
  content: string
  attachments: Attachment[]
  created_at: string
}

interface Participant {
  id: string
  session_id: string
  user_id: string
  user_email: string | null
  role: 'customer' | 'mechanic'
  joined_at: string | null
}

export default function ChatPopup({ sessionId, sessionType, userEmail, onClose }: ChatPopupProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sessionValid, setSessionValid] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const mechanicJoinedAt = participants.find(p => p.role === 'mechanic')?.joined_at || null

  // Validate session exists on mount (Phase 3.2: Pre-insert validation)
  useEffect(() => {
    let isActive = true

    const validateSession = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle()

      if (!isActive) return

      if (error || !data) {
        console.error('[ChatPopup] Session validation failed:', error)
        setSessionValid(false)
        alert('This session no longer exists. Please return to the dashboard.')
      }
    }

    void validateSession()

    return () => {
      isActive = false
    }
  }, [sessionId, supabase])

  useEffect(() => {
    let isActive = true

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (!isActive || !data) return
      setMessages(data.map(normalizeMessage))
    }

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)

      if (!isActive || !data) return
      setParticipants(data.map(normalizeParticipant))
    }

    void fetchMessages()
    void fetchParticipants()

    const messagesChannel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (!isActive) return
          setMessages((prev) => [...prev, normalizeMessage(payload.new as ChatMessageRow)])
        }
      )
      .subscribe()

    const participantsChannel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void fetchParticipants()
        }
      )
      .subscribe()

    return () => {
      isActive = false
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(participantsChannel)
    }
  }, [sessionId, supabase])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    // Phase 3.2: Validate session before inserting message
    if (!sessionValid) {
      alert('Cannot send message: session is invalid')
      return
    }

    setSending(true)
    try {
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_email: userEmail,
        content: newMessage.trim(),
        attachments: [],
      })

      if (error) {
        // Handle foreign key constraint violations
        if (error.code === '23503') {
          console.error('[ChatPopup] Foreign key violation:', error)
          alert('Cannot send message: session or sender reference is invalid')
          setSessionValid(false)
          return
        }
        throw error
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Phase 3.2: Validate session before file upload
    if (!sessionValid) {
      alert('Cannot upload file: session is invalid')
      return
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName)

      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_email: userEmail,
        content: `Sent a file: ${file.name}`,
        attachments: [
          {
            name: file.name,
            url: publicUrl,
            size: file.size,
            type: file.type,
          },
        ],
      })

      if (error) {
        // Handle foreign key constraint violations
        if (error.code === '23503') {
          console.error('[ChatPopup] Foreign key violation on file upload:', error)
          alert('Cannot send file: session or sender reference is invalid')
          setSessionValid(false)
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleEndSession() {
    if (confirm('Are you sure you want to end this session?')) {
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)

      onClose()
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all"
        >
          <User className="w-5 h-5" />
          <span className="font-medium">Chat Session</span>
          {mechanicJoinedAt && (
            <span className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-700 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold">Mechanic Chat Session</h2>
            <p className="text-sm text-blue-100">
              {participants.find(p => p.role === 'mechanic')
                ? 'Connected with mechanic'
                : 'Waiting for mechanic...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleEndSession}
              className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
              title="End session"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timer */}
        <div className="p-4 border-b bg-gray-50">
          <SessionTimer
            sessionType={sessionType}
            startedAt={mechanicJoinedAt}
            onSessionEnd={handleEndSession}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => {
            const senderParticipant =
              participants.find(
                (participant) =>
                  (msg.sender_id && participant.user_id === msg.sender_id) ||
                  (msg.sender_email && participant.user_email === msg.sender_email)
              ) ?? null
            const senderEmail = msg.sender_email ?? senderParticipant?.user_email ?? null
            const isMechanic = senderParticipant?.role === 'mechanic'
            const isMe = senderEmail === userEmail

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs font-medium text-gray-600">
                      {isMechanic ? 'Mechanic' : isMe ? 'You' : senderEmail ?? 'Guest'}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isMe
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mt-2">
                        {msg.attachments.map((att, idx) => {
                          const url = typeof att.url === 'string' ? att.url : undefined
                          const label = typeof att.name === 'string' ? att.name : url ?? `Attachment ${idx + 1}`

                          if (!url) return null

                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs underline flex items-center gap-1 ${
                                isMe ? 'text-blue-100' : 'text-orange-600'
                              }`}
                            >
                              <Paperclip className="w-3 h-3" />
                              {label}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-xl">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          {uploading && (
            <p className="text-xs text-gray-500 mt-2">Uploading file...</p>
          )}
        </form>
      </div>
    </div>
  )
}

function normalizeMessage(row: ChatMessageRow): Message {
  const withEmail = row as ChatMessageRow & { sender_email?: string | null }
  const attachmentsRaw = withEmail.attachments

  const attachments: Attachment[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
        .filter(isJsonRecord)
        .map((item) => {
          const record = item as Record<string, Json | undefined>
          const name = typeof record.name === 'string' ? record.name : undefined
          const url = typeof record.url === 'string' ? record.url : undefined

          return {
            ...record,
            name,
            url,
          } as Attachment
        })
    : []

  return {
    id: withEmail.id,
    session_id: withEmail.session_id,
    sender_id: typeof withEmail.sender_id === 'string' ? withEmail.sender_id : null,
    sender_email: typeof withEmail.sender_email === 'string' ? withEmail.sender_email : null,
    content: withEmail.content,
    attachments,
    created_at: withEmail.created_at,
  }
}

function normalizeParticipant(row: SessionParticipantRow): Participant {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>

  const email =
    typeof metadata.email === 'string'
      ? metadata.email
      : typeof metadata.user_email === 'string'
        ? metadata.user_email
        : null

  const joined =
    typeof metadata.joined_at === 'string'
      ? metadata.joined_at
      : typeof metadata.joinedAt === 'string'
        ? metadata.joinedAt
        : row.created_at ?? null

  const role = metadata.role === 'mechanic' || metadata.role === 'customer' ? metadata.role : row.role

  return {
    id: row.id,
    session_id: row.session_id,
    user_id: row.user_id,
    user_email: email,
    role: role as Participant['role'],
    joined_at: joined,
  }
}

function isJsonRecord(value: Json): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
