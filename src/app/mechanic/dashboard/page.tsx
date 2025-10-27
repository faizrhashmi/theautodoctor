'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, MessageSquare, Video, FileText, User, Calendar, AlertTriangle, RefreshCw, Bell, CheckCheck } from 'lucide-react'
import MechanicActiveSessionsManager from '@/components/mechanic/MechanicActiveSessionsManager'
import { createClient } from '@/lib/supabase'

interface ActiveSession {
  id: string
  plan: string
  planLabel: string
  type: 'chat' | 'video' | 'diagnostic'
  typeLabel: string
  status: string
  createdAt: string
  startedAt: string | null
  customerName: string | null
}

interface DashboardStats {
  pending_sessions: number
  active_quotes: number
  approved_today: number
  revenue_this_month: number
  total_completed_sessions: number
}

interface RecentSession {
  id: string
  customer_name: string
  session_type: string
  status: string
  plan: string
  created_at: string
  ended_at: string | null
}

export default function MechanicDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notification = searchParams.get('notification')
  const [loading, setLoading] = useState(true)
  const [checkingTier, setCheckingTier] = useState(true)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingRecentSessions, setLoadingRecentSessions] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [acceptingRequest, setAcceptingRequest] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  // Manual retry handler
  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    setRetryCount(prev => prev + 1)
  }

  useEffect(() => {
    // Check mechanic's service tier and route appropriately
    const checkServiceTier = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        const data = await response.json()

        if (response.ok && data) {
          // Route virtual-only mechanics to their specific dashboard
          if (data.service_tier === 'virtual_only') {
            router.replace('/mechanic/dashboard/virtual')
            return
          }

          // Workshop-affiliated mechanics stay on this dashboard
          setCheckingTier(false)
          setLoading(false)
        } else {
          setCheckingTier(false)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to check service tier:', err)
        setCheckingTier(false)
        setLoading(false)
      }
    }

    checkServiceTier()
  }, [router])

  // Fetch active sessions - mechanics can only have ONE active session at a time
  useEffect(() => {
    const fetchActiveSessions = async () => {
      console.log('[MechanicDashboard] Fetching active sessions...')
      try {
        const response = await fetch('/api/mechanic/active-sessions')
        console.log('[MechanicDashboard] Active sessions response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('[MechanicDashboard] Active sessions data:', data)
          const sessions = data.sessions || []
          setActiveSessions(sessions)
          console.log('[MechanicDashboard] Set active sessions count:', sessions.length)
        } else {
          const errorText = await response.text()
          console.error('[MechanicDashboard] Failed to fetch active sessions:', response.status, errorText)
        }
      } catch (err) {
        console.error('[MechanicDashboard] Error fetching active sessions:', err)
      }
    }

    fetchActiveSessions()
  }, [])

  // Fetch pending requests - CRITICAL: Show available requests mechanics can accept
  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoadingRequests(true)
      try {
        const response = await fetch('/api/mechanics/requests?status=pending')
        if (response.ok) {
          const data = await response.json()
          const requests = data.requests || []
          setPendingRequests(requests)
          console.log('[MechanicDashboard] Fetched pending requests:', requests.length)
        } else {
          console.error('[MechanicDashboard] Failed to fetch requests:', response.status, response.statusText)
        }
      } catch (err) {
        console.error('Failed to fetch pending requests:', err)
      } finally {
        setLoadingRequests(false)
      }
    }

    if (!checkingTier) {
      fetchPendingRequests()
    }
  }, [checkingTier])

  // Handler to accept a request
  const handleAcceptRequest = async (requestId: string) => {
    if (activeSessions.length > 0) {
      alert('You already have an active session. Please complete it before accepting new requests.')
      return
    }

    setAcceptingRequest(requestId)
    try {
      const response = await fetch('/api/mechanic/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Success - remove from pending and redirect to session
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
        alert('Request accepted! Redirecting to session...')

        // Route based on session type
        const sessionType = data.session?.type || 'diagnostic'
        const routes: Record<string, string> = {
          chat: '/chat',
          video: '/video',
          diagnostic: '/diagnostic',
        }
        const route = routes[sessionType] || '/diagnostic'
        window.location.href = `${route}/${data.sessionId}`
      } else {
        alert(data.error || 'Failed to accept request')
      }
    } catch (err) {
      console.error('Failed to accept request:', err)
      alert('Failed to accept request. Please try again.')
    } finally {
      setAcceptingRequest(null)
    }
  }

  // Fetch dashboard stats with error handling and retry
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true)
      setLoadingRecentSessions(true)
      setError(null)

      try {
        const response = await fetch('/api/mechanic/dashboard/stats')

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data.stats)
        setRecentSessions(data.recent_sessions || [])
        setError(null)
      } catch (err) {
        console.error('[MechanicDashboard] Failed to fetch dashboard stats:', err)
        setError('Unable to load dashboard data. Please check your connection.')

        // Auto-retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000)
          console.log(`[MechanicDashboard] Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`)
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, retryDelay)
        }
      } finally {
        setLoadingStats(false)
        setLoadingRecentSessions(false)
      }
    }

    fetchStats()
  }, [retryCount])

  // Real-time subscription for session updates
  useEffect(() => {
    if (checkingTier || !supabase) return

    console.log('[MechanicDashboard] Setting up real-time subscriptions')

    const refetchData = async () => {
      console.log('[MechanicDashboard] Session updated, refetching data...')

      // Refetch pending requests
      try {
        const requestsResponse = await fetch('/api/mechanics/requests?status=pending')
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setPendingRequests(requestsData.requests || [])
        }
      } catch (err) {
        console.error('Failed to refetch pending requests:', err)
      }

      // Refetch active sessions
      try {
        const activeResponse = await fetch('/api/mechanic/active-sessions')
        if (activeResponse.ok) {
          const activeData = await activeResponse.json()
          setActiveSessions(activeData.sessions || [])
        }
      } catch (err) {
        console.error('Failed to refetch active sessions:', err)
      }

      // Refetch stats and recent sessions
      try {
        const statsResponse = await fetch('/api/mechanic/dashboard/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
          setRecentSessions(statsData.recent_sessions || [])
        }
      } catch (err) {
        console.error('Failed to refetch stats:', err)
      }
    }

    // Subscribe to sessions table changes
    const channel = supabase
      .channel('mechanic-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        (payload) => {
          console.log('[MechanicDashboard] Session change detected:', payload)
          refetchData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
        },
        (payload) => {
          console.log('[MechanicDashboard] Session request change detected:', payload)
          refetchData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_quotes',
        },
        (payload) => {
          console.log('[MechanicDashboard] Quote change detected:', payload)
          refetchData()
        }
      )
      .subscribe((status) => {
        console.log('[MechanicDashboard] Subscription status:', status)
      })

    return () => {
      console.log('[MechanicDashboard] Cleaning up subscriptions')
      supabase.removeChannel(channel)
    }
  }, [checkingTier, supabase])

  if (checkingTier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 pt-20 lg:pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Mechanic Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your sessions and quotes</p>
        </div>

        {notification === 'quote_sent' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ✓ Quote sent successfully! Customer will be notified.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 font-medium mb-1">Error Loading Dashboard</p>
                <p className="text-sm text-red-300">{error}</p>
                {retryCount >= 3 && (
                  <p className="text-xs text-red-400 mt-2">
                    Auto-retry limit reached. Please try again manually.
                  </p>
                )}
              </div>
              <button
                onClick={handleRetry}
                disabled={loadingStats}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-200 rounded-lg text-sm font-semibold hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* PENDING REQUESTS - Show available requests that need to be accepted */}
        {loadingRequests ? (
          <div className="mb-6 sm:mb-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-64"></div>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="mb-6 sm:mb-8 bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-blue-400 animate-pulse" />
              <div>
                <h2 className="text-xl font-bold text-white">New Service Requests</h2>
                <p className="text-sm text-blue-300 mt-1">
                  {pendingRequests.length} customer{pendingRequests.length > 1 ? 's are' : ' is'} waiting for help
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-blue-500/30 bg-slate-900/50 hover:border-blue-500/50 transition-all overflow-hidden"
                >
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-800/50 border-b border-blue-500/20">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/40">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white truncate">
                            {request.customer_name || 'Customer'}
                          </h3>
                          {request.intake?.urgent && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                              URGENT
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
                          <span className="capitalize">{request.session_type || 'diagnostic'} session</span>
                          <span className="text-slate-600">•</span>
                          <span>{new Date(request.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={acceptingRequest === request.id || activeSessions.length > 0}
                      className="mt-3 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {acceptingRequest === request.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCheck className="h-4 w-4" />
                          Accept Request
                        </>
                      )}
                    </button>
                  </div>

                  {/* Vehicle & Concern Details Section */}
                  {request.intake && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vehicle Information */}
                      {(request.intake.year || request.intake.make || request.intake.model) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Vehicle Details
                          </h4>
                          <div className="bg-slate-800/50 rounded-lg p-3 space-y-1.5">
                            {(request.intake.year || request.intake.make || request.intake.model) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">Vehicle:</span>
                                <span className="text-white font-medium">
                                  {request.intake.year} {request.intake.make} {request.intake.model}
                                </span>
                              </div>
                            )}
                            {request.intake.vin && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">VIN:</span>
                                <span className="text-white font-mono text-xs">{request.intake.vin}</span>
                              </div>
                            )}
                            {request.intake.plate && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">Plate:</span>
                                <span className="text-white font-mono text-xs">{request.intake.plate}</span>
                              </div>
                            )}
                            {request.intake.odometer && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">Mileage:</span>
                                <span className="text-white">{Number(request.intake.odometer).toLocaleString()} km</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Customer Concern */}
                      {request.intake.concern && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Customer Concern
                          </h4>
                          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                            <p className="text-white text-sm leading-relaxed">{request.intake.concern}</p>
                          </div>
                        </div>
                      )}

                      {/* Uploaded Files */}
                      {request.files && request.files.length > 0 && (
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Uploaded Files ({request.files.length})
                          </h4>
                          <div className="bg-slate-800/50 rounded-lg p-3 flex flex-wrap gap-2">
                            {request.files.map((file: any, idx: number) => (
                              <a
                                key={idx}
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/20 transition-colors text-sm"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {file.file_name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Active Sessions Manager - Shows active session and enforces one-session-at-a-time */}
        {activeSessions.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <MechanicActiveSessionsManager sessions={activeSessions} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {loadingStats ? (
            // Loading skeletons for stats cards
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-24 mb-3"></div>
                  <div className="h-9 bg-slate-700 rounded w-16"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
                <div className="text-sm text-slate-400 mb-1">Pending Sessions</div>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.pending_sessions ?? 0}
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
                <div className="text-sm text-slate-400 mb-1">Active Quotes</div>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.active_quotes ?? 0}
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
                <div className="text-sm text-slate-400 mb-1">Approved Today</div>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.approved_today ?? 0}
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
                <div className="text-sm text-slate-400 mb-1">Revenue This Month</div>
                <div className="text-3xl font-bold text-purple-600">
                  ${stats?.revenue_this_month?.toFixed(2) ?? '0.00'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Recent Sessions</h2>
              <p className="text-sm text-slate-400 mt-1">Your latest completed and active sessions</p>
            </div>
            <Link
              href="/mechanic/sessions"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All →
            </Link>
          </div>

          {loadingRecentSessions ? (
            // Loading skeletons for recent sessions
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 animate-pulse">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-slate-700"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-slate-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-slate-700 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-slate-700 rounded w-20"></div>
                    <div className="h-9 bg-slate-700 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No recent sessions</p>
              <p className="text-sm text-slate-500">Your completed sessions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const sessionIcon = session.session_type === 'video' ? Video : session.session_type === 'chat' ? MessageSquare : FileText
                const statusIcon = session.status === 'completed' ? CheckCircle : session.status === 'cancelled' ? XCircle : Clock
                const statusColor = session.status === 'completed' ? 'text-green-400' : session.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'

                return (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:border-blue-500/50 transition-all gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30">
                        {(() => {
                          const Icon = sessionIcon
                          return <Icon className="h-5 w-5 text-blue-400" />
                        })()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white truncate">{session.customer_name}</h3>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-sm text-slate-400 capitalize">{session.session_type}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          {session.ended_at && (
                            <span>
                              Ended {new Date(session.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        {(() => {
                          const StatusIcon = statusIcon
                          return <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                        })()}
                        <span className={`text-sm font-medium capitalize ${statusColor}`}>
                          {session.status}
                        </span>
                      </div>

                      <Link
                        href={`/mechanic/session/${session.id}`}
                        className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/20 border border-blue-500/30 transition-colors text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
