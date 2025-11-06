/**
 * Browser Notifications Handler
 *
 * Tier 3: Native browser push notifications when tab is inactive
 */

import { features } from '@/lib/featureFlags'

/**
 * Request notification permission from the browser
 * Call once on mechanic dashboard mount
 */
export function ensureNotificationPermission() {
  if (!features.mechBrowserNotifications) return
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) {
    console.log('[Browser Notifications] Not supported in this browser')
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission()
      .then((permission) => {
        console.log('[Browser Notifications] Permission:', permission)
      })
      .catch((err) => {
        console.error('[Browser Notifications] Permission request failed:', err)
      })
  }
}

/**
 * Send browser notification for new session request
 * Only shows when tab is inactive/background
 */
export function notifyViaBrowser(payload: {
  requestId: string
  customerName?: string
  vehicle?: string
  concern?: string
}) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return

  // Only show when tab is in background
  if (document.visibilityState === 'visible') return

  // Check permission
  if (Notification.permission !== 'granted') return

  try {
    const title = 'New Session Request'
    const body = `${payload.customerName || 'Customer'} – ${payload.vehicle || ''}${
      payload.concern ? ` • ${payload.concern}` : ''
    }`

    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png', // Adjust to your app icon path
      tag: `req-${payload.requestId}`, // Prevent duplicate notifications
      requireInteraction: false, // Auto-dismiss after a few seconds
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (error) {
    console.error('[Browser Notifications] Error showing notification:', error)
  }
}

/**
 * Check if browser notifications are available and permitted
 */
export function isBrowserNotificationsAvailable() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  return Notification.permission === 'granted'
}
