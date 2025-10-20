'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import FloatingChatPopup from './FloatingChatPopup'

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-blue-600 px-5 py-3 text-white shadow-xl transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          isOpen && !isMinimized ? 'hidden sm:flex' : ''
        }`}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">Chat with Support</span>
      </button>

      <FloatingChatPopup
        isOpen={isOpen && !isMinimized}
        onClose={() => {
          setIsOpen(false)
          setIsMinimized(false)
        }}
        onMinimize={() => setIsMinimized(true)}
      />

      {isMinimized && (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-lg"
        >
          Reopen chat
        </button>
      )}
    </>
  )
}
