'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import FloatingChatPopup from './FloatingChatPopup'

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleChat = () => setIsOpen(!isOpen)

  return (
    <>
      <button
        type="button"
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 text-white shadow-xl transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
        aria-label={isOpen ? "Close chat" : "Chat with Support"}
        title={isOpen ? "Close chat" : "Chat with Support"}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      <FloatingChatPopup
        isOpen={isOpen}
        onClose={toggleChat}
        onMinimize={toggleChat}
      />
    </>
  )
}
