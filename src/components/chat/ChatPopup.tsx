'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minimize2, Maximize2, Send, Paperclip, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import SessionTimer from './SessionTimer'

interface ChatPopupProps {
  sessionId: string
  sessionType: 'chat' | 'video' | 'diagnostic'
  userEmail: string
  onClose: () => void
}

interface Message {
  id: string
  session_id: string
  sender_email: string
  content: string
  attachments: any[]
  created_at: string
}

interface Participant {
  id: string
  session_id: string
  user_email: string
  role: 'customer' | 'mechanic'
  joined_at: string
}

export default function ChatPopup({ sessionId, sessionType, userEmail, onClose }: ChatPopupProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const mechanicJoinedAt = participants.find(p => p.role === 'mechanic')?.joined_at || null

  useEffect(() => {
    loadMessages()
    loadParticipants()
    subscribeToMessages()
    subscribeToParticipants()
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  async function loadParticipants() {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)

    if (data) setParticipants(data)
  }

  function subscribeToMessages() {
    const channel = supabase
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
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function subscribeToParticipants() {
    const channel = supabase
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
          loadParticipants()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_email: userEmail,
        content: newMessage.trim(),
        attachments: [],
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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

      await supabase.from('chat_messages').insert({
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
            const isMechanic = participants.find(p => p.user_email === msg.sender_email)?.role === 'mechanic'
            const isMe = msg.sender_email === userEmail

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs font-medium text-gray-600">
                      {isMechanic ? 'Mechanic' : 'You'}
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
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2">
                        {msg.attachments.map((att: any, idx: number) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs underline flex items-center gap-1 ${
                              isMe ? 'text-blue-100' : 'text-orange-600'
                            }`}
                          >
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                          </a>
                        ))}
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
