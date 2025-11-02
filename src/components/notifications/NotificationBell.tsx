'use client'

import { useState, useEffect, useCallback } from 'react'
import { NotificationCenter } from './NotificationCenter'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Play notification sound (throttled per poll cycle)
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.7
      audio.play().catch(() => {
        // Fail silently if sound can't play (muted tab, file missing, etc.)
      })
    } catch (error) {
      // Fail silently - no error shown to user
    }
  }, [])

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/feed?limit=1')
      if (response.ok) {
        const data = await response.json()
        const newCount = data.unreadCount || 0

        // Play sound only if count increased (new notification) and not initial load
        if (!loading && newCount > previousUnreadCount) {
          playNotificationSound()
        }

        setPreviousUnreadCount(newCount)
        setUnreadCount(newCount)
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [userId])

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
        {!loading && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse animation for new notifications */}
        {!loading && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </button>

      {/* Notification Center Panel */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={handleClose}
        userId={userId}
      />
    </>
  )
}
