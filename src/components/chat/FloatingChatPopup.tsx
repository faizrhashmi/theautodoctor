'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowDownToLine, Minus, Send, X } from 'lucide-react'

interface FloatingChatPopupProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
}

export default function FloatingChatPopup({ isOpen, onClose, onMinimize }: FloatingChatPopupProps) {
  const [messages, setMessages] = useState<Array<{ id: string; body: string; author: 'customer' | 'mechanic'; timestamp: string }>>([
    {
      id: '1',
      body: 'Thanks for booking! Drop any files here ahead of our call.',
      author: 'mechanic',
      timestamp: new Date().toISOString()
    }
  ])
  const [draft, setDraft] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [supportStatus, setSupportStatus] = useState(getSupportStatus)

  useEffect(() => {
    if (!isOpen) return
    const node = scrollerRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isOpen])

  useEffect(() => {
    const interval = setInterval(() => {
      setSupportStatus(getSupportStatus())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const sendMessage = () => {
    if (!draft.trim()) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), body: draft.trim(), author: 'customer', timestamp: new Date().toISOString() }
    ])
    setDraft('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-24 right-6 z-[60] w-[min(360px,90vw)] rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 rounded-t-2xl bg-blue-600 px-4 py-3 text-white">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-blue-100">Live Support</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Chat with Support</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                supportStatus.isOnline ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-300/20 text-amber-100'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  supportStatus.isOnline ? 'bg-emerald-300' : 'bg-amber-300 animate-pulse'
                }`}
              />
              {supportStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-blue-100/80">{supportStatus.message}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-full bg-white/10 p-1 transition hover:bg-white/20"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-1 transition hover:bg-white/20"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex h-80 flex-col">
        <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {!supportStatus.isOnline && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50/80 p-3 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <p>Our team is offline right now. Leave a message and we will respond by email as soon as we are back online.</p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.author === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.author === 'customer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p>{message.body}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider opacity-60">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <footer className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
            <span>Encrypted messaging</span>
            <button type="button" className="flex items-center gap-1 text-blue-600">
              <ArrowDownToLine className="h-3 w-3" />
              Save transcript
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Type a message"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="flex items-center justify-center rounded-xl bg-blue-600 p-2 text-white shadow-sm transition hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

type SupportStatus = {
  isOnline: boolean
  message: string
}

const SUPPORT_STATUS_OVERRIDE = process.env.NEXT_PUBLIC_SUPPORT_CHAT_STATUS?.toLowerCase()

const getSupportStatus = (): SupportStatus => {
  if (SUPPORT_STATUS_OVERRIDE === 'online') {
    return {
      isOnline: true,
      message: 'We are online and usually reply within 15 minutes.'
    }
  }

  if (SUPPORT_STATUS_OVERRIDE === 'offline') {
    return {
      isOnline: false,
      message: 'Offline — leave a message and we will email you shortly.'
    }
  }

  const now = new Date()
  const timeParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.NEXT_PUBLIC_SUPPORT_CHAT_TZ ?? 'America/Toronto',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  }).formatToParts(now)

  const lookup = Object.fromEntries(timeParts.map((part) => [part.type, part.value])) as {
    hour?: string
    minute?: string
    weekday?: string
  }

  const hour = Number(lookup.hour ?? '0')
  const minute = Number(lookup.minute ?? '0')
  const weekday = lookup.weekday ?? 'Mon'

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0
  }

  const day = weekdayMap[weekday] ?? 0
  const schedule = getSchedule()
  const slot = schedule.find((entry) => entry.days.includes(day))

  if (!slot) {
    return {
      isOnline: false,
      message: 'Offline — leave a message and we will email you shortly.'
    }
  }

  const current = hour + minute / 60
  const isOnline = current >= slot.start && current < slot.end

  return {
    isOnline,
    message: isOnline
      ? slot.message.online
      : slot.message.offline
  }
}

type ScheduleEntry = {
  days: number[]
  start: number
  end: number
  message: { online: string; offline: string }
}

const getSchedule = (): ScheduleEntry[] => {
  if (SUPPORT_STATUS_OVERRIDE === 'online') {
    return []
  }

  const defaultSchedule: ScheduleEntry[] = [
    {
      days: [1, 2, 3, 4, 5],
      start: 9,
      end: 21,
      message: {
        online: 'We are online and usually reply within 15 minutes.',
        offline: 'Our team is offline — leave a message and we will reply first thing next business day.'
      }
    },
    {
      days: [6],
      start: 10,
      end: 16,
      message: {
        online: 'We are online and typically reply within an hour on Saturdays.',
        offline: 'Outside Saturday hours — leave a message and we will follow up.'
      }
    }
  ]

  return defaultSchedule
}
