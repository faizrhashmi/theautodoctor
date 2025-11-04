'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { routeFor, apiRouteFor } from '@/lib/routes'

interface Notification {
  id: string
  type: string
  payload: any
  read_at: string | null
  created_at: string
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function NotificationCenter({ isOpen, onClose, userId }: NotificationCenterProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const [clearingRead, setClearingRead] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch(apiRouteFor.notificationsFeed(50))
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('[NotificationCenter] Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (markingRead.has(notificationId)) return

    setMarkingRead(prev => new Set(prev).add(notificationId))

    try {
      const response = await fetch(apiRouteFor.notificationsMarkRead(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notificationId] })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        )
      }
    } catch (error) {
      console.error('[NotificationCenter] Error marking as read:', error)
    } finally {
      setMarkingRead(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(apiRouteFor.notificationsMarkRead(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        )
      }
    } catch (error) {
      console.error('[NotificationCenter] Error marking all as read:', error)
    }
  }

  // Clear read notifications
  const clearReadNotifications = async () => {
    setClearingRead(true)
    try {
      const response = await fetch(apiRouteFor.notificationsClearRead(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Remove read notifications from local state
        setNotifications(prev => prev.filter(n => !n.read_at))
        setShowClearConfirm(false)
      }
    } catch (error) {
      console.error('[NotificationCenter] Error clearing read notifications:', error)
    } finally {
      setClearingRead(false)
    }
  }

  // Track notification click (non-blocking, fire-and-forget)
  const trackNotificationClick = (notification: Notification) => {
    try {
      const trackingData = {
        notification_id: notification.id,
        notification_type: notification.type,
        clicked_at: new Date().toISOString(),
        was_unread: !notification.read_at,
        payload_keys: Object.keys(notification.payload || {}),
      }

      // Console logging for observability (can be upgraded to API endpoint later)
      console.log('[NotificationClick]', JSON.stringify(trackingData))

      // Future: Send to analytics endpoint
      // fetch('/api/analytics/notification-click', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(trackingData)
      // }).catch(() => {}) // Fail silently, don't block navigation
    } catch (error) {
      // Fail silently - tracking should never block user navigation
      console.warn('[NotificationClick] Tracking failed:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Track the click (non-blocking)
    trackNotificationClick(notification)

    // Mark as read if unread
    if (!notification.read_at) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    const payload = notification.payload || {}

    switch (notification.type) {
      case 'request_created':
        // Mechanic-only: new session request received
        if (payload.request_id) {
          router.push(routeFor.mechanicDashboard({ request: payload.request_id }))
        }
        break

      case 'request_submitted':
        // Customer-only: their session request was submitted
        router.push(routeFor.customerSessions())
        break

      case 'request_accepted':
        // Either role: session request was accepted
        if (payload.request_id) {
          router.push(routeFor.mechanicDashboard({ request: payload.request_id }))
        }
        break

      case 'session_started':
        if (payload.session_id) {
          const sessionType = payload.session_type || 'chat'
          router.push(sessionType === 'chat' ? routeFor.chat(payload.session_id) : routeFor.video(payload.session_id))
        }
        break

      case 'session_completed':
        // Phase 3.1: Go to session details if available
        if (payload.session_id) {
          router.push(`/sessions/${payload.session_id}/summary`)
        } else {
          router.push(routeFor.customerSessions())
        }
        break

      case 'summary_ready':
        // Phase 3.1: Go directly to session summary
        if (payload.session_id) {
          router.push(`/sessions/${payload.session_id}/summary`)
        } else {
          router.push(routeFor.customerSessions())
        }
        break

      case 'message_received':
        if (payload.session_id) {
          router.push(routeFor.chat(payload.session_id))
        }
        break

      case 'quote_received':
        if (payload.quote_id) {
          router.push(routeFor.quote(payload.quote_id))
        } else if (payload.diagnostic_session_id) {
          router.push(routeFor.quotes())
        }
        break

      case 'payment_received':
        // Navigate to workshop analytics for diagnostic payments, mechanic earnings otherwise
        if (payload.type === 'diagnostic_payment') {
          router.push(routeFor.workshopAnalytics())
        } else {
          router.push(routeFor.mechanicEarnings())
        }
        break

      case 'session_cancelled':
        if (payload.session_id) {
          router.push(routeFor.session(payload.session_id))
        }
        break

      case 'request_rejected':
        router.push(routeFor.customerSessions())
        break

      // Phase 3.2: Repair job notifications
      case 'repair_job_created':
        if (payload.repair_job_id) {
          router.push(`/customer/repairs/${payload.repair_job_id}`)
        } else {
          router.push('/customer/repairs')
        }
        break

      case 'repair_job_update':
      case 'repair_status_changed':
        if (payload.repair_job_id) {
          router.push(`/customer/repairs/${payload.repair_job_id}`)
        } else {
          router.push('/customer/repairs')
        }
        break

      case 'repair_ready_for_pickup':
        if (payload.repair_job_id) {
          router.push(`/customer/repairs/${payload.repair_job_id}`)
        } else {
          router.push('/customer/repairs')
        }
        break

      case 'repair_parts_ordered':
      case 'repair_parts_received':
        if (payload.repair_job_id) {
          router.push(`/customer/repairs/${payload.repair_job_id}`)
        }
        break

      case 'repair_waiting_approval':
        // High priority - needs customer action
        if (payload.repair_job_id) {
          router.push(`/customer/repairs/${payload.repair_job_id}/approve`)
        } else {
          router.push('/customer/repairs')
        }
        break

      // Phase 3: RFQ notifications
      case 'rfq_bid_received':
        if (payload.rfq_id) {
          router.push(`/customer/rfq/${payload.rfq_id}/bids`)
        } else {
          router.push('/customer/rfq/my-rfqs')
        }
        break

      case 'rfq_accepted':
        if (payload.rfq_id) {
          router.push(`/customer/rfq/${payload.rfq_id}/accepted`)
        } else {
          router.push('/customer/rfq/my-rfqs')
        }
        break

      default:
        console.log('[NotificationCenter] Unknown notification type:', notification.type)
    }

    onClose()
  }

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Don't render if closed
  if (!isOpen) return null

  const unreadNotifications = notifications.filter(n => !n.read_at)
  const readNotifications = notifications.filter(n => n.read_at)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="fixed top-16 right-4 z-50 w-full max-w-md max-h-[80vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {unreadNotifications.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {unreadNotifications.length} unread
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {unreadNotifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 transition hover:border-indigo-500/50 hover:bg-indigo-500/20"
              >
                Mark all read
              </button>
            )}
            {readNotifications.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20"
              >
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent" />
              <p className="mt-2 text-sm text-slate-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-2 text-sm text-slate-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-white mb-2">Clear read notifications?</h4>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete {readNotifications.length} read notification{readNotifications.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingRead}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={clearReadNotifications}
                disabled={clearingRead}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {clearingRead ? 'Clearing...' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Individual notification item
function NotificationItem({
  notification,
  onClick
}: {
  notification: Notification
  onClick: () => void
}) {
  const isUnread = !notification.read_at

  // Get notification icon and color based on type
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'request_created':
        return { icon: 'M12 4v16m8-8H4', color: 'text-blue-400', bg: 'bg-blue-500/10' }
      case 'request_submitted':
        return { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-400', bg: 'bg-blue-500/10' }
      case 'request_accepted':
        return { icon: 'M5 13l4 4L19 7', color: 'text-green-400', bg: 'bg-green-500/10' }
      case 'session_started':
        return { icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-purple-400', bg: 'bg-purple-500/10' }
      case 'session_completed':
        return { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
      case 'summary_ready':
        return { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-green-400', bg: 'bg-green-500/10' }
      case 'message_received':
        return { icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
      case 'quote_received':
        return { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
      case 'payment_received':
        return { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
      case 'session_cancelled':
        return { icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-red-400', bg: 'bg-red-500/10' }
      case 'request_rejected':
        return { icon: 'M6 18L18 6M6 6l12 12', color: 'text-orange-400', bg: 'bg-orange-500/10' }
      default:
        return { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-slate-400', bg: 'bg-slate-500/10' }
    }
  }

  const style = getNotificationStyle(notification.type)

  // Format timestamp
  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Get notification message
  const getMessage = () => {
    const payload = notification.payload || {}
    switch (notification.type) {
      case 'request_created':
        return 'New session request received'
      case 'request_submitted':
        return 'Your session request was submitted'
      case 'request_accepted':
        return 'Your session request was accepted'
      case 'session_started':
        return 'Session has started'
      case 'session_completed':
        return `Session completed by ${payload.ended_by || 'participant'}`
      case 'summary_ready':
        const issueCount = payload.issue_count || 0
        return `Session report ready${issueCount > 0 ? ` - ${issueCount} issue${issueCount > 1 ? 's' : ''} identified` : ''}`
      case 'message_received':
        return payload.preview ? payload.preview : 'New message received'
      case 'quote_received':
        return `New quote received from ${payload.workshop_name || 'workshop'}`
      case 'payment_received':
        return `Payment received: $${payload.amount ? payload.amount.toFixed(2) : '0.00'}`
      case 'session_cancelled':
        return `Session cancelled by ${payload.ended_by || 'participant'}`
      case 'request_rejected':
        return 'Your session request was declined'
      default:
        return 'New notification'
    }
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left transition hover:bg-slate-800/50 ${
        isUnread ? 'bg-slate-800/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}>
          <svg className={`h-5 w-5 ${style.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isUnread ? 'font-semibold text-white' : 'text-slate-300'}`}>
            {getMessage()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {timeAgo(notification.created_at)}
          </p>
        </div>

        {/* Unread Indicator */}
        {isUnread && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
          </div>
        )}
      </div>
    </button>
  )
}
