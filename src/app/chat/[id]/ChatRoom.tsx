'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ChatMessage, SessionParticipant } from '@/types/supabase'

type Message = Pick<ChatMessage, 'id' | 'content' | 'created_at' | 'sender_id'>
type Participant = Pick<SessionParticipant, 'user_id' | 'role'>

type ChatRoomProps = {
  sessionId: string
  userId: string
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

export default function ChatRoom({
  sessionId,
  userId,
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
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const mechanicCount = participants.filter((p) => p.role === 'mechanic').length

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
            return [...prev, { id: msg.id, content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id }]
          })
        },
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
        },
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
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) {
      return
    }

    setSending(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        content: trimmed,
      })
      if (insertError) {
        throw insertError
      }
      setInput('')
    } catch (insertErr: any) {
      setError(insertErr?.message ?? 'Unable to send message right now.')
    } finally {
      setSending(false)
    }
  }

  const headerStatus = mechanicCount > 0 ? `${mechanicCount} mechanic${mechanicCount > 1 ? 's' : ''} connected` : 'Waiting for a mechanic to join'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{planName}</p>
            <p className="text-xs text-slate-500">Status: {status ?? 'pending'}</p>
          </div>
          <div className="text-xs font-medium text-slate-600">{headerStatus}</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Welcome! Share what&apos;s going on with your vehicle and your mechanic will reply here.
            </p>
          ) : (
            messages.map((message) => {
              const isSelf = message.sender_id === userId
              return (
                <div key={message.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-md ${
                      isSelf ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <span className={`mt-1 block text-[10px] ${isSelf ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatTimestamp(message.created_at)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600">Message your mechanic</label>
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
            placeholder="Type your question or update. Press Enter to send, Shift+Enter for a new line."
            rows={3}
            maxLength={1000}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            disabled={sending}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">{input.trim().length} / 1000</span>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
        </form>
      </main>
    </div>
  )
}
