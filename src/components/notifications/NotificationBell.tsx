'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { NotificationCenter } from './NotificationCenter'

interface NotificationBellProps {
  userId: string
  userRole?: 'customer' | 'mechanic' | 'workshop'
}

export function NotificationBell({ userId, userRole = 'customer' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const previousUnreadCountRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  // Play notification sound (throttled per poll cycle)
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/message-pop.mp3')
      audio.volume = 0.7
      audio.play().catch(() => {
        // Fail silently if sound can't play (muted tab, file missing, etc.)
      })
    } catch (error) {
      // Fail silently - no error shown to user
    }
  }, [])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/feed?limit=1')
      if (response.ok) {
        const data = await response.json()
        const newCount = data.unreadCount || 0
        const prevCount = previousUnreadCountRef.current

        // Play sound only if count increased (new notification) and not initial load
        if (!isInitialLoadRef.current && newCount > prevCount) {
          console.log('[NotificationBell] Playing sound - new notification detected', {
            newCount,
            prevCount,
            isInitialLoad: isInitialLoadRef.current
          })
          playNotificationSound()
        }

        previousUnreadCountRef.current = newCount
        setUnreadCount(newCount)
        isInitialLoadRef.current = false
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching unread count:', error)
    }
  }, [playNotificationSound])

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Realtime subscription for mechanics - new session assignments
  useEffect(() => {
    if (userRole !== 'mechanic') return

    const supabase = createClient()
    const channel = supabase
      .channel('session_assignments_feed', {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'new_assignment' }, (payload) => {
        console.log('[NotificationBell] New assignment broadcast received:', payload)

        // Increment unread count
        setUnreadCount((prev) => prev + 1)
        previousUnreadCountRef.current = previousUnreadCountRef.current + 1

        // Play notification sound
        playNotificationSound()

        // Optionally show toast notification (if you have react-hot-toast)
        try {
          // @ts-ignore - toast may not be imported yet
          if (typeof window !== 'undefined' && window.toast) {
            // @ts-ignore
            window.toast.success('New session request received')
          }
        } catch (e) {
          // Ignore if toast not available
        }

        // Refresh full count from server to stay in sync
        setTimeout(fetchUnreadCount, 1000)
      })
      .subscribe((status) => {
        console.log('[NotificationBell] Realtime subscription status:', status)
      })

    return () => {
      console.log('[NotificationBell] Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [userRole, playNotificationSound, fetchUnreadCount])

  // Update count when panel is closed (notifications might have been read)
  const handleClose = () => {
    setIsOpen(false)
    fetchUnreadCount()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white z-10">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse animation for new notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </button>

      {/* Notification Center Panel */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={handleClose}
        userId={userId}
        userRole={userRole}
      />
    </>
  )
}
