'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ChatMessage, SessionParticipant } from '@/types/supabase'

type Message = Pick<ChatMessage, 'id' | 'content' | 'created_at' | 'sender_id'> & {
  attachments?: Array<{ name: string; url: string; size: number; type: string }>
}
type Participant = Pick<SessionParticipant, 'user_id' | 'role'>

type ChatRoomProps = {
  sessionId: string
  userId: string
  userEmail: string | null
  planName: string
  status: string | null
  initialMessages: Message[]
  initialParticipants: Participant[]
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
  userEmail,
  planName,
  status,
  initialMessages,
  initialParticipants,
}: ChatRoomProps) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(() => [...initialMessages])
  const [participants, setParticipants] = useState<Participant[]>(() => [...initialParticipants])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const mechanicCount = participants.filter((p) => p.role === 'mechanic').length
  const isMechanic = participants.find((p) => p.user_id === userId)?.role === 'mechanic'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) {
              return prev
            }
            return [
              ...prev,
              {
                id: msg.id,
                content: msg.content,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                attachments: msg.attachments as any,
              },
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const participant = payload.new as SessionParticipant
          setParticipants((prev) => {
            if (prev.some((p) => p.user_id === participant.user_id)) {
              return prev
            }
            return [...prev, { user_id: participant.user_id, role: participant.role }]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const participant = payload.old as SessionParticipant
          setParticipants((prev) => prev.filter((p) => p.user_id !== participant.user_id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  async function uploadFile(file: File): Promise<{ name: string; url: string; size: number; type: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError, data } = await supabase.storage
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

      const { error: insertError } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        content: trimmed || '📎 Attachment',
        attachments: uploadedFiles,
      })

      if (insertError) {
        throw insertError
      }

      setInput('')
      setAttachments([])
    } catch (insertErr: any) {
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

  const headerStatus =
    mechanicCount > 0
      ? `${mechanicCount} mechanic${mechanicCount > 1 ? 's' : ''} online`
      : 'Waiting for mechanic...'
  const headerColor = mechanicCount > 0 ? 'text-green-600' : 'text-amber-600'

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600">
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
              <h1 className="text-sm font-semibold text-slate-900">{planName}</h1>
              <p className={`text-xs font-medium ${headerColor}`}>
                {mechanicCount > 0 ? '● ' : '○ '}
                {headerStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Session: {status || 'pending'}
            </span>
            {isMechanic && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Mechanic
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-6 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-sm">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Start the conversation</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {isMechanic
                    ? 'Say hello to the customer and ask how you can help.'
                    : 'Describe your issue and a mechanic will respond shortly.'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isSelf = message.sender_id === userId
              return (
                <div key={message.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-lg gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelf ? 'bg-orange-600' : 'bg-slate-600'
                      } text-xs font-semibold text-white`}
                    >
                      {isSelf ? (isMechanic ? 'M' : 'Y') : isMechanic ? 'C' : 'M'}
                    </div>

                    {/* Message Bubble */}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm ${
                          isSelf
                            ? 'rounded-tr-sm bg-orange-600 text-white'
                            : 'rounded-tl-sm bg-slate-100 text-slate-900'
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
                                className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition hover:bg-opacity-10 ${
                                  isSelf
                                    ? 'border-orange-400 bg-orange-500 bg-opacity-20 hover:bg-orange-400'
                                    : 'border-slate-300 bg-white hover:bg-slate-50'
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
                                  <p className={`${isSelf ? 'text-blue-100' : 'text-slate-500'}`}>
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
                      <span className={`px-1 text-[10px] text-slate-400 ${isSelf ? 'text-right' : 'text-left'}`}>
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
        <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* File Previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="max-w-xs truncate font-medium text-slate-700">{file.name}</span>
                  <span className="text-slate-400">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="ml-1 text-slate-400 hover:text-red-600"
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
                placeholder="Type your message... (Shift+Enter for new line)"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-blue-100"
                disabled={sending || uploading}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
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
                disabled={sending || uploading}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={sending || uploading || (!input.trim() && attachments.length === 0)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
    </div>
  )
}
