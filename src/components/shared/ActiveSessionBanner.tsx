'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
 * - Auto-refreshes every 30 seconds to detect session changes
 * - Conditional rendering based on hideOnDashboard prop
 */
export function ActiveSessionBanner({
  userRole,
  initialSession = null,
  onSessionEnded,
  hideOnDashboard = false
}: ActiveSessionBannerProps) {
  const [session, setSession] = useState<ActiveSession | null>(initialSession)
  const [loading, setLoading] = useState(false)
  const [ending, setEnding] = useState(false)

  // Fetch active session
  const fetchActiveSession = async () => {
    try {
      setLoading(true)

      const endpoint = userRole === 'customer'
        ? '/api/customer/sessions/active'
        : '/api/mechanic/active-session'

      console.log('[ActiveSessionBanner] Fetching active session from:', endpoint)
      const response = await fetch(endpoint)

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
      console.log('[ActiveSessionBanner] Fetched session:', data.session ? `${data.session.id} (${data.session.status})` : 'null')
      setSession(data.session || null)
    } catch (error) {
      console.error('[ActiveSessionBanner] Error fetching active session:', error)
    } finally {
      setLoading(false)
    }
  }

  // End session
  const handleEndSession = async () => {
    if (!session || !confirm('Are you sure you want to end this session?')) {
      return
    }

    try {
      setEnding(true)

      const response = await fetch(`/api/sessions/${session.id}/end`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to end session')
      }

      console.log('[ActiveSessionBanner] Session ended successfully, clearing state')
      setSession(null)

      // Immediately re-fetch to ensure we have latest state from database
      // This prevents the banner from reappearing if the auto-refresh interval fires
      setTimeout(async () => {
        console.log('[ActiveSessionBanner] Re-fetching session state after end')
        await fetchActiveSession()
      }, 500) // Small delay to allow database to update

      onSessionEnded?.()
    } catch (error) {
      console.error('[ActiveSessionBanner] Error ending session:', error)
      alert('Failed to end session. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  // Auto-refresh every 30 seconds if no initial session provided
  useEffect(() => {
    if (initialSession) {
      return // Don't auto-refresh if session was passed as prop
    }

    fetchActiveSession()
    const interval = setInterval(fetchActiveSession, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [initialSession])

  // Don't render if no active session OR if hideOnDashboard is true
  if (!session || hideOnDashboard) {
    return null
  }

  // Route mapping
  const sessionRoute =
    session.type === 'chat' ? `/chat/${session.id}` :
    session.type === 'video' ? `/video/${session.id}` :
    `/diagnostic/${session.id}`

  // Determine if session has started (industry standard: check if someone joined)
  const sessionStarted = !!session.startedAt

  // Industry-standard status messaging
  const getStatusMessage = () => {
    if (userRole === 'customer') {
      // Customer perspective
      if (session.status === 'live') {
        if (session.mechanicName) {
          return `${session.mechanicName} in session`
        }
        return 'Session live'
      } else if (session.status === 'waiting') {
        if (session.mechanicName && sessionStarted) {
          return `${session.mechanicName} waiting for you`
        } else if (session.mechanicName) {
          return `${session.mechanicName} assigned`
        }
        return 'Waiting for mechanic'
      } else if (session.status === 'pending') {
        return 'Pending mechanic assignment'
      }
      return session.status
    } else {
      // Mechanic perspective
      if (session.status === 'live') {
        if (session.customerName) {
          return `${session.customerName} in session`
        }
        return 'Session live'
      } else if (session.status === 'waiting') {
        if (session.customerName) {
          return `${session.customerName} waiting`
        }
        return 'Waiting for customer'
      }
      return session.status
    }
  }

  const statusMessage = getStatusMessage()

  return (
    <div className={`sticky top-0 z-40 border-b backdrop-blur-md shadow-lg transition-all duration-300 ${
      session.status === 'live' || session.status === 'waiting'
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
                session.status === 'live'
                  ? 'bg-emerald-500'
                  : session.status === 'waiting'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
              }`} />
              {session.status === 'live' && (
                <div className="absolute h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <span className="text-sm font-medium text-slate-200">
                {session.type.charAt(0).toUpperCase() + session.type.slice(1)} Session
              </span>

              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border inline-flex items-center gap-1.5 ${
                session.status === 'live'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                session.status === 'waiting'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  session.status === 'live' ? 'bg-emerald-400' :
                  session.status === 'waiting' ? 'bg-blue-400' : 'bg-amber-400'
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
