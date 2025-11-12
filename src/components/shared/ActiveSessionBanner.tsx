'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useMechanicActiveSession } from '@/contexts/MechanicActiveSessionContext'
import { listenCustomerActiveSession } from '@/lib/realtimeListeners'
import { createClient } from '@/lib/supabase'

interface ActiveSession {
  id: string
  type: 'chat' | 'video' | 'diagnostic'
  status: 'pending' | 'waiting' | 'live' | 'scheduled'
  plan: string
  createdAt: string
  startedAt?: string | null
  mechanicName?: string | null
  customerName?: string | null
}

interface ActiveSessionBannerProps {
  /**
   * User role - determines which API endpoint to call
   */
  userRole: 'customer' | 'mechanic'

  /**
   * Optional: Pre-fetched active session (to avoid extra API call)
   */
  initialSession?: ActiveSession | null

  /**
   * Optional: Callback when session is ended
   */
  onSessionEnded?: () => void

  /**
   * Optional: Hide banner on specific pages (e.g., mechanic main dashboard)
   */
  hideOnDashboard?: boolean
}

/**
 * Professional banner that appears at the top when user has an active session
 *
 * Features:
 * - Shows session type and status
 * - "Return to Session" button
 * - "End Session" button (for customers)
 * - MECHANICS: Uses MechanicActiveSessionContext (single source of truth, 5s polling)
 * - CUSTOMERS: Uses legacy polling (1s) for now (will migrate later)
 * - Conditional rendering based on hideOnDashboard prop
 */
export function ActiveSessionBanner({
  userRole,
  initialSession = null,
  onSessionEnded,
  hideOnDashboard = false
}: ActiveSessionBannerProps) {
  // ✅ MECHANICS: Use context (single source of truth, optimized polling)
  // ✅ CUSTOMERS: Use local state + polling (legacy approach, will migrate later)
  const mechanicContext = userRole === 'mechanic' ? useMechanicActiveSession() : null

  const [session, setSession] = useState<ActiveSession | null>(initialSession)
  const [loading, setLoading] = useState(false)
  const [ending, setEnding] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousSessionRef = useRef<string | null>(null)
  const currentIntervalRef = useRef<number>(1000) // Track current polling interval
  const realtimeConnectedRef = useRef<boolean>(false) // Track if realtime is connected
  const [userId, setUserId] = useState<string | null>(null)

  // ✅ For mechanics, use context session instead of local state
  const activeSession = userRole === 'mechanic' && mechanicContext?.activeSession
    ? mechanicContext.activeSession
    : session

  // Fetch active session
  const fetchActiveSession = async () => {
    try {
      setLoading(true)

      const endpoint = userRole === 'customer'
        ? '/api/customer/sessions/active'
        : '/api/mechanic/active-session'

      console.log('[ActiveSessionBanner] Fetching active session from:', endpoint)
      const response = await fetch(endpoint, { cache: 'no-store' })

      if (response.status === 404) {
        // No active session
        console.log('[ActiveSessionBanner] No active session found (404)')
        setSession(null)
        return
      }

      if (!response.ok) {
        console.error('[ActiveSessionBanner] Failed to fetch active session:', response.statusText)
        return
      }

      const data = await response.json()

      // Defensive: if no active session or session is null, clear state
      if (!data?.active || !data?.session) {
        setSession(null)
        return
      }

      // Defensive: if backend ever returns a non-actionable status, hide the banner
      const bad = data.session.status === 'completed' || data.session.status === 'cancelled'
      if (bad) {
        console.log('[ActiveSessionBanner] Ignoring non-active session status:', data.session.status)
        setSession(null)
        return
      }

      console.log('[ActiveSessionBanner] Fetched session:', `${data.session.id} (${data.session.status})`)
      setSession(data.session)
    } catch (error) {
      console.error('[ActiveSessionBanner] Error fetching active session:', error)
    } finally {
      setLoading(false)
    }
  }

  // End session
  const handleEndSession = async () => {
    if (!activeSession || !confirm('Are you sure you want to end this session?')) {
      return
    }

    try {
      setEnding(true)

      const response = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to end session')
      }

      console.log('[ActiveSessionBanner] Session ended successfully, clearing state and stopping polling')

      // Clear local UI immediately (only for customers, mechanics use context)
      if (userRole === 'customer') {
        setSession(null)
      }

      // Stop the polling interval to prevent flicker (only for customers)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // ✅ For mechanics, trigger context refetch
      if (userRole === 'mechanic' && mechanicContext) {
        await mechanicContext.refetch()
      }

      // Dispatch custom event to notify SessionLauncher to refresh
      window.dispatchEvent(new CustomEvent('session-ended', { detail: { sessionId: activeSession.id } }))

      onSessionEnded?.()
    } catch (error) {
      console.error('[ActiveSessionBanner] Error ending session:', error)
      alert('Failed to end session. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  // 🚀 PHASE 2: SUPABASE REALTIME + SMART POLLING FALLBACK (2025-11-12)
  // Primary: Supabase Realtime for instant updates (95-99% API reduction)
  // Fallback: Smart polling if realtime disconnects (60-80% reduction vs old)
  // ✅ CRITICAL: Only for CUSTOMERS - mechanics use context
  useEffect(() => {
    // ✅ MECHANICS: Skip entirely, use context instead
    if (userRole === 'mechanic') {
      console.log('[ActiveSessionBanner] Mechanic mode: using context, skipping local subscriptions')
      return
    }

    // ✅ CUSTOMERS ONLY: Use Supabase Realtime + smart polling fallback
    if (initialSession) {
      return // Don't auto-refresh if session was passed as prop
    }

    let realtimeCleanup: (() => void) | null = null
    let unchangedCount = 0

    // 📊 Page-aware fallback polling intervals
    const FALLBACK_INTERVALS = {
      chatPage: 3000,      // 3s - Realtime should handle it, this is backup
      videoPage: 3000,     // 3s - Realtime should handle it, this is backup
      otherPages: 10000,   // 10s - Slower fallback for non-critical pages
      dashboard: 15000,    // 15s - Very slow fallback for dashboard
    }

    const getBaseInterval = (): number => {
      if (typeof window === 'undefined') return 10000
      const path = window.location.pathname
      if (path.includes('/chat/')) return FALLBACK_INTERVALS.chatPage
      if (path.includes('/video/')) return FALLBACK_INTERVALS.videoPage
      if (path.includes('/dashboard')) return FALLBACK_INTERVALS.dashboard
      return FALLBACK_INTERVALS.otherPages
    }

    let baseInterval = getBaseInterval()
    currentIntervalRef.current = baseInterval

    // Fetch active session from API (used for initial load and fallback)
    const fetchActiveSession = async () => {
      try {
        const endpoint = '/api/customer/sessions/active'
        const logPrefix = realtimeConnectedRef.current
          ? '[ActiveSessionBanner:Fallback]'
          : '[ActiveSessionBanner:InitialFetch]'

        console.log(`${logPrefix} Fetching active session...`)
        const response = await fetch(endpoint, { cache: 'no-store' })

        if (response.status === 404) {
          setSession(null)
          return null
        }

        if (response.ok) {
          const data = await response.json()
          if (data?.active && data?.session) {
            const bad = data.session.status === 'completed' || data.session.status === 'cancelled'
            if (!bad) {
              setSession(data.session)
              return data.session
            }
          }
        }

        setSession(null)
        return null
      } catch (error) {
        console.error('[ActiveSessionBanner] Fetch error:', error)
        return null
      }
    }

    // 🎯 Smart fallback polling (only runs if realtime disconnected)
    const startFallbackPolling = () => {
      const MAX_INTERVAL = 30000 // Max 30s for fallback

      const smartPoll = async () => {
        // Skip polling if realtime is connected
        if (realtimeConnectedRef.current) {
          console.log('[ActiveSessionBanner:Fallback] Realtime connected, skipping poll')
          intervalRef.current = setTimeout(smartPoll, currentIntervalRef.current)
          return
        }

        await fetchActiveSession()

        // Exponential backoff when realtime is down
        unchangedCount++
        currentIntervalRef.current = Math.min(currentIntervalRef.current * 1.5, MAX_INTERVAL)

        intervalRef.current = setTimeout(smartPoll, currentIntervalRef.current)
      }

      console.log('[ActiveSessionBanner:Fallback] Starting fallback polling at', baseInterval, 'ms')
      smartPoll()
    }

    // 🌐 Setup Supabase Realtime subscription
    const setupRealtime = async () => {
      try {
        // Get user ID
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.log('[ActiveSessionBanner] Not authenticated, using fallback polling only')
          realtimeConnectedRef.current = false
          startFallbackPolling()
          return
        }

        setUserId(user.id)

        // Subscribe to customer's active session changes
        console.log('[ActiveSessionBanner] 🌐 Setting up Supabase Realtime for user', user.id)

        realtimeCleanup = listenCustomerActiveSession(user.id, (event) => {
          realtimeConnectedRef.current = true // Mark as connected

          console.log('[ActiveSessionBanner:Realtime] 📨 Session event:', event.eventType, event.new?.status)

          if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
            const sessionData = event.new
            const bad = sessionData.status === 'completed' || sessionData.status === 'cancelled'

            if (!bad) {
              // Active session - update banner
              setSession({
                id: sessionData.id,
                type: sessionData.type || 'chat',
                status: sessionData.status,
                plan: sessionData.plan || 'standard',
                createdAt: sessionData.created_at,
                startedAt: sessionData.started_at,
                mechanicName: sessionData.mechanic_name,
                customerName: sessionData.customer_name
              })
            } else {
              // Session ended - hide banner
              setSession(null)
            }
          } else if (event.eventType === 'DELETE') {
            // Session deleted - hide banner
            setSession(null)
          }
        })

        console.log('[ActiveSessionBanner] ✅ Supabase Realtime subscribed')

        // Do initial fetch to populate banner immediately
        const initialSession = await fetchActiveSession()

        // Start fallback polling in case realtime disconnects
        startFallbackPolling()

      } catch (error) {
        console.error('[ActiveSessionBanner] Realtime setup failed:', error)
        realtimeConnectedRef.current = false
        startFallbackPolling()
      }
    }

    // Start everything
    setupRealtime()

    // Listen for legacy events from other components
    const handleSessionEnded = (e: any) => {
      console.log('[ActiveSessionBanner] session-ended event received')
      setSession(null)
    }

    const handleSessionUpdate = () => {
      console.log('[ActiveSessionBanner] customer:sessions:update event received')
      fetchActiveSession()
    }

    window.addEventListener('session-ended', handleSessionEnded)
    window.addEventListener('customer:sessions:update', handleSessionUpdate)

    // Cleanup
    return () => {
      console.log('[ActiveSessionBanner] 🔌 Cleaning up subscriptions')

      if (realtimeCleanup) {
        realtimeCleanup()
      }

      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }

      window.removeEventListener('session-ended', handleSessionEnded)
      window.removeEventListener('customer:sessions:update', handleSessionUpdate)

      realtimeConnectedRef.current = false
    }
  }, [initialSession, userRole])

  // Don't render if no active session OR if hideOnDashboard is true
  // ✅ Use activeSession (which is context for mechanics, local state for customers)
  if (!activeSession || hideOnDashboard) {
    return null
  }

  // Route mapping - use activeSession
  const sessionRoute =
    activeSession.type === 'chat' ? `/chat/${activeSession.id}` :
    activeSession.type === 'video' ? `/video/${activeSession.id}` :
    `/diagnostic/${activeSession.id}`

  // Determine if session has started (industry standard: check if someone joined)
  const sessionStarted = !!activeSession.startedAt

  // Industry-standard status messaging
  const getStatusMessage = () => {
    if (userRole === 'customer') {
      // Customer perspective
      if (activeSession.status === 'live') {
        if (activeSession.mechanicName) {
          return `${activeSession.mechanicName} in session`
        }
        return 'Session live'
      } else if (activeSession.status === 'waiting') {
        if (activeSession.mechanicName && sessionStarted) {
          return `${activeSession.mechanicName} waiting for you`
        } else if (activeSession.mechanicName) {
          return `${activeSession.mechanicName} assigned`
        }
        return 'Waiting for mechanic'
      } else if (activeSession.status === 'pending') {
        return 'Pending mechanic assignment'
      }
      return activeSession.status
    } else {
      // Mechanic perspective
      if (activeSession.status === 'live') {
        if (activeSession.customerName) {
          return `${activeSession.customerName} in session`
        }
        return 'Session live'
      } else if (activeSession.status === 'waiting') {
        if (activeSession.customerName) {
          return `${activeSession.customerName} waiting`
        }
        return 'Waiting for customer'
      }
      return activeSession.status
    }
  }

  const statusMessage = getStatusMessage()

  return (
    <div className={`sticky top-0 z-40 border-b backdrop-blur-md shadow-lg transition-all duration-300 ${
      activeSession.status === 'live' || activeSession.status === 'waiting'
        ? 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-800/95 animate-[breathe_3s_ease-in-out_infinite]'
        : 'border-slate-700/50 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/95'
    }`}>
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          50% {
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.15), 0 0 20px rgba(16, 185, 129, 0.1);
          }
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status info */}
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center`}>
              <div className={`h-3 w-3 rounded-full ${
                activeSession.status === 'live'
                  ? 'bg-emerald-500'
                  : activeSession.status === 'waiting'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
              }`} />
              {activeSession.status === 'live' && (
                <div className="absolute h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <span className="text-sm font-medium text-slate-200">
                {activeSession.type.charAt(0).toUpperCase() + activeSession.type.slice(1)} Session
              </span>

              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border inline-flex items-center gap-1.5 ${
                activeSession.status === 'live'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                activeSession.status === 'waiting'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  activeSession.status === 'live' ? 'bg-emerald-400' :
                  activeSession.status === 'waiting' ? 'bg-blue-400' : 'bg-amber-400'
                }`} />
                {statusMessage}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5">
            {/* Return to Session */}
            <Link
              href={sessionRoute}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Return to Session
            </Link>

            {/* End Session (customers only) */}
            {userRole === 'customer' && (
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-600/50 hover:border-red-500/50 bg-slate-800/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 text-sm font-medium transition-all duration-200 disabled:opacity-50"
              >
                {ending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Ending...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    End Session
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
