'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import ChatPopup from './ChatPopup'
import { createClient } from '@/lib/supabase'

interface ChatBubbleProps {
  userEmail: string
}

interface ActiveSession {
  id: string
  type: 'chat' | 'video' | 'diagnostic'
  status: string
}

export default function ChatBubble({ userEmail }: ChatBubbleProps) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadActiveSession()
    subscribeToSessions()
  }, [userEmail])

  async function loadActiveSession() {
    // Find active session for this user
    const { data: participants } = await supabase
      .from('session_participants')
      .select('session_id')
      .eq('user_email', userEmail)

    if (!participants || participants.length === 0) {
      setActiveSession(null)
      return
    }

    const sessionIds = participants.map(p => p.session_id)

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, type, status')
      .in('id', sessionIds)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessions && sessions.length > 0) {
      setActiveSession(sessions[0] as ActiveSession)
    } else {
      setActiveSession(null)
    }
  }

  function subscribeToSessions() {
    const channel = supabase
      .channel(`user-sessions:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
        },
        () => {
          loadActiveSession()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          loadActiveSession()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  useEffect(() => {
    if (!activeSession || showChat) {
      setHasUnread(false)
      return
    }

    // Subscribe to new messages when chat is minimized
    const channel = supabase
      .channel(`unread:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload: any) => {
          // Only mark as unread if message is not from current user
          if (payload.new.sender_email !== userEmail) {
            setHasUnread(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeSession, showChat, userEmail])

  if (!activeSession) {
    return null
  }

  return (
    <>
      {/* Floating chat bubble */}
      {!showChat && (
        <button
          onClick={() => {
            setShowChat(true)
            setHasUnread(false)
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              !
            </span>
          )}
          <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Open active session
          </span>
        </button>
      )}

      {/* Chat popup */}
      {showChat && activeSession && (
        <ChatPopup
          sessionId={activeSession.id}
          sessionType={activeSession.type}
          userEmail={userEmail}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  )
}
