'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, Minus, Send, X } from 'lucide-react'

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

  useEffect(() => {
    if (!isOpen) return
    const node = scrollerRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isOpen])

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
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-100">Live Support</p>
          <p className="text-sm font-semibold">Chat with a mechanic</p>
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
