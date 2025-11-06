/**
 * New Session Request Alerts Handler
 *
 * Tier 1-4: Multi-layer notification system for mechanics
 * - Toast notifications (visual)
 * - Audio alerts
 * - Browser notifications (when tab inactive)
 * - Visual indicators (badges, tab title)
 */

import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { playNotificationSound } from '@/lib/notificationSound'
import { notifyViaBrowser } from '@/lib/browserNotifications'
import { useNewRequestsIndicator } from '@/state/newRequestsIndicator'

export type NewRequestPayload = {
  requestId: string
  customerName?: string
  vehicle?: string
  concern?: string
}

export type FeatureFlags = {
  mech_new_request_alerts: boolean
  mech_audio_alerts: boolean
  mech_browser_notifications: boolean
  mech_visual_indicators: boolean
}

/**
 * Main handler for new session requests
 * Coordinates all notification tiers
 * @param payload - Request information
 * @param flags - Feature flags from database (admin-controlled)
 */
export function onNewSessionRequest(payload: NewRequestPayload, flags: FeatureFlags) {
  if (!flags.mech_new_request_alerts) return

  console.log('[New Request Alert] Received:', payload)

  // Tier 1: Toast (always)
  showNewRequestToast(payload)

  // Tier 2: Audio (opt-in flag)
  if (flags.mech_audio_alerts) {
    playNotificationSound()
  }

  // Tier 3: Browser notifications (if tab is background & granted)
  if (flags.mech_browser_notifications) {
    notifyViaBrowser(payload)
  }

  // Tier 4: Persistent visual indicators
  if (flags.mech_visual_indicators) {
    useNewRequestsIndicator.getState().bump()
  }
}

/**
 * Show toast notification with action buttons
 * Tier 1 implementation
 */
function showNewRequestToast(payload: NewRequestPayload) {
  const toastId = `new-req-${payload.requestId}`

  toast.custom(
    (t) => (
      <motion.div
        initial={{ x: 280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 280, opacity: 0 }}
        className="w-[92vw] sm:w-[420px] max-w-[420px] bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl shadow-2xl p-5 border border-orange-400 will-change-transform"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 flex-shrink-0">
            <Bell className="h-6 w-6 animate-bounce" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">New Session Request</h3>
            <p className="text-sm opacity-95 mt-1 truncate">
              {payload.customerName || 'Customer'} • {payload.vehicle || 'Vehicle'}
            </p>
            {payload.concern && (
              <p className="text-xs opacity-80 mt-1 line-clamp-2">{payload.concern}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              // Dispatch custom event to trigger existing accept handler
              window.dispatchEvent(
                new CustomEvent('mechanic-accept-request', {
                  detail: payload.requestId,
                })
              )
              toast.dismiss(t.id)
            }}
            className="flex-1 bg-white text-orange-700 font-semibold py-2 px-4 rounded-lg hover:bg-orange-50 transition"
          >
            Accept Now
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            View Later
          </button>
        </div>
      </motion.div>
    ),
    {
      id: toastId,
      duration: 10000, // 10 seconds
      position: 'top-center',
    }
  )
}
