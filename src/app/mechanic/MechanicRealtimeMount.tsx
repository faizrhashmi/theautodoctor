'use client'

import { useEffect, useRef } from 'react'
import { listenMechanicDashboard } from '@/lib/realtimeListeners'

declare global {
  interface Window {
    __mechanicRealtimeInit?: boolean
    __mechanicDashboardCleanup?: () => void
  }
}

/**
 * Persistent Realtime Listener for Mechanic Dashboard
 *
 * CRITICAL: This component mounts once per browser tab and persists across route changes.
 * It lives under /app/mechanic/layout.tsx so navigating between mechanic routes
 * doesn't kill and recreate subscriptions.
 *
 * How it works:
 * 1. Mounts once when user enters /mechanic/* routes
 * 2. Creates realtime subscriptions using browser-only client
 * 3. Emits custom window events when postgres_changes fire
 * 4. Individual pages listen to these events and refetch data
 * 5. Only cleans up on hard tab close (beforeunload)
 *
 * Why this approach:
 * - Subscriptions survive route changes (no CLOSED/SUBSCRIBED spam)
 * - Single connection per tab (efficient)
 * - Pages decouple from subscription management
 * - Realtime works even when navigating between routes
 */
export default function MechanicRealtimeMount() {
  const mounted = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-mounting in dev
    if (mounted.current) return
    mounted.current = true

    // Guard against multiple instances in same tab
    if (window.__mechanicRealtimeInit) {
      console.log('[MechanicRealtimeMount] Already initialized, skipping')
      return
    }

    console.log('[MechanicRealtimeMount] 🚀 Initializing persistent realtime listeners...')
    window.__mechanicRealtimeInit = true

    // Start all listeners using dedicated browser client
    const cleanup = listenMechanicDashboard({
      // Session assignment changes (INSERT when waiver signed, UPDATE when accepted/declined)
      onSessionAssignment: (evt) => {
        console.log('[MechanicRealtimeMount] 📨 Assignment event, emitting custom event')

        // Emit custom window event that dashboard can listen to
        window.dispatchEvent(
          new CustomEvent('mechanic:assignments:update', {
            detail: {
              eventType: evt.eventType,
              assignmentId: evt.new?.id || evt.old?.id,
              status: evt.new?.status,
              sessionId: evt.new?.session_id || evt.old?.session_id
            }
          })
        )
      },

      // Session changes (status transitions: pending → waiting → live → completed)
      onSession: (evt) => {
        console.log('[MechanicRealtimeMount] 📨 Session event, emitting custom event')

        window.dispatchEvent(
          new CustomEvent('mechanic:sessions:update', {
            detail: {
              eventType: evt.eventType,
              sessionId: evt.new?.id || evt.old?.id,
              status: evt.new?.status
            }
          })
        )
      },

      // Quote changes (customer approves/rejects quotes)
      onQuote: (evt) => {
        console.log('[MechanicRealtimeMount] 📨 Quote event, emitting custom event')

        window.dispatchEvent(
          new CustomEvent('mechanic:quotes:update', {
            detail: {
              eventType: evt.eventType,
              quoteId: evt.new?.id || evt.old?.id
            }
          })
        )
      },
    })

    // Expose cleanup for debugging
    window.__mechanicDashboardCleanup = cleanup
    console.log('[MechanicRealtimeMount] ✅ Persistent listeners active')

    // Only cleanup on hard tab close (not on route changes!)
    const handleBeforeUnload = () => {
      console.log('[MechanicRealtimeMount] 👋 Tab closing, cleaning up listeners')
      cleanup()
      window.__mechanicRealtimeInit = false
      delete window.__mechanicDashboardCleanup
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // IMPORTANT: Return cleanup that ONLY removes beforeunload listener
    // Do NOT call cleanup() here - we want persistence across route changes
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      console.log('[MechanicRealtimeMount] Component unmounting (route change), keeping listeners alive')
    }
  }, [])

  // This component renders nothing - it just manages subscriptions
  return null
}
