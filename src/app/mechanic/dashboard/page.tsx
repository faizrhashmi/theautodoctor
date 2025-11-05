'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, MessageSquare, Video, FileText, User, Calendar, AlertTriangle, RefreshCw, Bell, CheckCheck } from 'lucide-react'
import OnShiftToggle from '@/components/mechanic/OnShiftToggle'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PresenceChip } from '@/components/ui/PresenceChip'
import { ConnectionQuality } from '@/components/ui/ConnectionQuality'
import { createClient } from '@/lib/supabase'
import RecentSessions from '@/components/dashboard/RecentSessions'
import SessionCard from '@/components/sessions/SessionCard'
import { ActiveSessionBanner } from '@/components/shared/ActiveSessionBanner'

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

interface PendingRequest {
  id: string
  customer_name: string
  session_type: string
  status: string
  created_at: string
  intake: any
  files: any[]
  urgent: boolean
  workshop_id: string | null
}

interface QueueItem {
  assignmentId: string
  sessionId: string
  sessionType: 'chat' | 'video' | 'diagnostic'
  sessionStatus: string
  plan?: string
  createdAt: string
  customer: {
    name?: string | null
  }
  vehicle?: {
    year?: string
    make?: string
    model?: string
  } | null
  concern?: string
  urgent?: boolean
}

export default function MechanicDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notification = searchParams.get('notification')
  
  const [loading, setLoading] = useState(true)
  const [checkingTier, setCheckingTier] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mechanicUserId, setMechanicUserId] = useState<string | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
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
    // Trigger refetch by incrementing retry count
    setRetryCount(prev => prev + 1)
  }

  // Auth guard - Check Supabase authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[MechanicDashboard] Checking Supabase authentication...')
        
        // Get the current session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[MechanicDashboard] Session error:', sessionError)
          throw sessionError
        }

        if (!session) {
          console.log('[MechanicDashboard] No session found, redirecting to login...')
          router.replace('/mechanic/login')
          return
        }

        console.log('[MechanicDashboard] Session found, verifying mechanic role...')

        // Verify this user is a mechanic
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile || profile.role !== 'mechanic') {
          console.log('[MechanicDashboard] User is not a mechanic, redirecting...')
          await supabase.auth.signOut()
          router.replace('/mechanic/login')
          return
        }

        // Get mechanic details
        const { data: mechanic, error: mechanicError } = await supabase
          .from('mechanics')
          .select('id, service_tier')
          .eq('user_id', session.user.id)
          .single()

        if (mechanicError || !mechanic) {
          console.log('[MechanicDashboard] No mechanic profile found, redirecting...')
          await supabase.auth.signOut()
          router.replace('/mechanic/login')
          return
        }

        setMechanicUserId(mechanic.id)
        setIsAuthenticated(true)
        setAuthChecking(false)
        
        console.log('[MechanicDashboard] Mechanic authenticated:', {
          userId: session.user.id,
          mechanicId: mechanic.id,
          serviceTier: mechanic.service_tier
        })

        // Route virtual-only mechanics to their specific dashboard
        if (mechanic.service_tier === 'virtual_only') {
          console.log('[MechanicDashboard] Virtual-only mechanic, redirecting...')
          router.replace('/mechanic/dashboard/virtual')
          return
        }

        setCheckingTier(false)
        setLoading(false)

      } catch (err) {
        console.error('[MechanicDashboard] Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }

    checkAuth()
  }, [router, supabase])

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

    if (isAuthenticated && !checkingTier) {
      fetchActiveSessions()
    }
  }, [isAuthenticated, checkingTier])

  // Fetch pending requests - CRITICAL: Show available requests mechanics can accept
  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoadingRequests(true)
      try {
        console.log('[MechanicDashboard] Fetching mechanic queue...')
        const response = await fetch('/api/mechanic/queue')

        if (response.ok) {
          const data = await response.json()
          const queueItems = data.queue || []
          setQueue(queueItems)
          console.log('[MechanicDashboard] Fetched queue items:', queueItems.length)
          console.log('[MechanicDashboard] Queue details:', queueItems)
        } else {
          console.error('[MechanicDashboard] Failed to fetch queue:', response.status, response.statusText)
          try {
            const errorData = await response.json()
            console.error('[MechanicDashboard] Queue error details:', errorData)
          } catch (e) {
            console.error('[MechanicDashboard] Could not parse error response')
          }
        }
      } catch (err) {
        console.error('[MechanicDashboard] Failed to fetch queue:', err)
      } finally {
        setLoadingRequests(false)
      }
    }

    if (isAuthenticated && !checkingTier) {
      fetchPendingRequests()
    }
  }, [isAuthenticated, checkingTier])

  // Handler to accept an assignment
  const handleAcceptAssignment = async (assignmentId: string, sessionType: string) => {
    if (activeSessions.length > 0) {
      alert('You already have an active session. Please complete it before accepting new requests.')
      return
    }

    setAcceptingRequest(assignmentId)
    try {
      console.log('[MechanicDashboard] Accepting assignment:', assignmentId)
      const response = await fetch(`/api/mechanic/assignments/${assignmentId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        // Success - remove from queue and redirect to session
        setQueue(prev => prev.filter(q => q.assignmentId !== assignmentId))
        console.log('[MechanicDashboard] Assignment accepted successfully:', data)

        // Route based on session type
        const routes: Record<string, string> = {
          chat: '/chat',
          video: '/video',
          diagnostic: '/diagnostic',
        }
        const route = routes[sessionType] || '/diagnostic'
        window.location.href = `${route}/${data.sessionId}`
      } else {
        console.error('[MechanicDashboard] Failed to accept assignment:', data)
        alert(data.error || 'Failed to accept assignment')
      }
    } catch (err) {
      console.error('[MechanicDashboard] Failed to accept assignment:', err)
      alert('Failed to accept assignment. Please try again.')
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
        console.log('[MechanicDashboard] Fetching dashboard stats...')
        const response = await fetch('/api/mechanic/dashboard/stats')

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data.stats)
        setRecentSessions(data.recent_sessions || [])
        setError(null)
        console.log('[MechanicDashboard] Stats loaded successfully')
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

    if (isAuthenticated && !checkingTier) {
      fetchStats()
    }
  }, [retryCount, isAuthenticated, checkingTier])

  // Real-time subscription for session updates
  useEffect(() => {
    if (checkingTier || !supabase || !isAuthenticated) return

    console.log('[MechanicDashboard] Setting up real-time subscriptions')

    const refetchData = async () => {
      console.log('[MechanicDashboard] 🔄 Real-time update detected, refetching all data...')

      // Refetch queue
      try {
        const queueResponse = await fetch('/api/mechanic/queue')
        if (queueResponse.ok) {
          const queueData = await queueResponse.json()
          setQueue(queueData.queue || [])
          console.log('[MechanicDashboard] ✓ Refetched queue:', queueData.queue?.length || 0)
        }
      } catch (err) {
        console.error('[MechanicDashboard] Failed to refetch queue:', err)
      }

      // Refetch active sessions
      try {
        const activeResponse = await fetch('/api/mechanic/active-sessions')
        if (activeResponse.ok) {
          const activeData = await activeResponse.json()
          setActiveSessions(activeData.sessions || [])
          console.log('[MechanicDashboard] ✓ Refetched active sessions:', activeData.sessions?.length || 0)
        }
      } catch (err) {
        console.error('[MechanicDashboard] Failed to refetch active sessions:', err)
      }

      // Refetch stats and recent sessions
      try {
        const statsResponse = await fetch('/api/mechanic/dashboard/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
          setRecentSessions(statsData.recent_sessions || [])
          console.log('[MechanicDashboard] ✓ Refetched stats and recent sessions')
        }
      } catch (err) {
        console.error('[MechanicDashboard] Failed to refetch stats:', err)
      }
    }

    // Window focus handler - refetch data when user returns to tab
    const onFocus = () => {
      console.log('[MechanicDashboard] Window focused, refetching data...')
      refetchData()
    }
    window.addEventListener('focus', onFocus)

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
          table: 'session_assignments',
        },
        (payload) => {
          console.log('[MechanicDashboard] Session assignment change detected:', payload)
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

    // Subscribe to broadcast channel for instant real-time session request updates
    const broadcastChannel = supabase
      .channel('session_requests_feed')
      .on(
        'broadcast',
        { event: 'new_request' },
        (payload) => {
          console.log('[MechanicDashboard] 🔔 NEW REQUEST broadcast received:', payload)
          // Immediately refetch pending requests to show new request
          refetchData()
        }
      )
      .on(
        'broadcast',
        { event: 'request_accepted' },
        (payload) => {
          console.log('[MechanicDashboard] Request accepted broadcast:', payload)
          refetchData()
        }
      )
      .on(
        'broadcast',
        { event: 'request_cancelled' },
        (payload) => {
          console.log('[MechanicDashboard] Request cancelled broadcast:', payload)
          refetchData()
        }
      )
      .subscribe((status) => {
        console.log('[MechanicDashboard] Broadcast channel status:', status)
      })

    return () => {
      console.log('[MechanicDashboard] Cleaning up subscriptions')
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [checkingTier, supabase, isAuthenticated])

  if (authChecking || checkingTier) {
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
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-8 pt-20 lg:pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mechanic Dashboard</h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your sessions and quotes</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ConnectionQuality quality="excellent" showLabel={true} />
            </div>
          </div>
        </div>

        {notification === 'quote_sent' && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-200 font-medium">
              ✓ Quote sent successfully! Customer will be notified.
            </p>
          </div>
        )}

        {/* On-Shift Status Toggle */}
        <div className="mb-6 sm:mb-8">
          <OnShiftToggle onStatusChange={(status) => {
            console.log('[MechanicDashboard] Shift status changed:', status)
            // Optionally refresh data when status changes
          }} />
        </div>

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
        ) : queue.length > 0 ? (
          <div className="mb-6 sm:mb-8 bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-6 w-6 text-blue-400 animate-pulse" />
              <div>
                <h2 className="text-xl font-bold text-white">Available Sessions</h2>
                <p className="text-sm text-blue-300 mt-1">
                  {queue.length} session{queue.length > 1 ? 's' : ''} waiting for a mechanic
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {queue.map((item) => (
                <SessionCard
                  key={item.assignmentId}
                  sessionId={item.sessionId}
                  type={item.sessionType}
                  status={item.sessionStatus as any}
                  plan={item.plan}
                  createdAt={item.createdAt}
                  partnerName={item.customer.name}
                  partnerRole="customer"
                  vehicle={item.vehicle}
                  concern={item.concern}
                  userRole="mechanic"
                  cta={{
                    action: 'Accept Request',
                    onClick: async () => {
                      await handleAcceptAssignment(item.assignmentId, item.sessionType)
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ) : !loadingRequests && (
          <div className="mb-6 sm:mb-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No Pending Requests</h3>
              <p className="text-slate-500">New service requests will appear here when customers need help.</p>
            </div>
          </div>
        )}

        {/* Active Sessions - Shows active session using SessionCard */}
        {activeSessions.length > 0 && (
          <div className="mb-6 sm:mb-8 bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Active Session</h2>
                <p className="text-sm text-green-300 mt-1">
                  You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  sessionId={session.id}
                  type={session.type}
                  status={session.status as any}
                  plan={session.plan}
                  createdAt={session.createdAt}
                  startedAt={session.startedAt}
                  partnerName={session.customerName}
                  partnerRole="customer"
                  userRole="mechanic"
                  cta={{
                    action: session.status === 'live' ? 'Return to Session' : 'Join Session',
                    route: `/${session.type}/${session.id}`
                  }}
                />
              ))}
            </div>
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Recent Sessions</h2>
              <p className="text-sm text-slate-400 mt-1">Your latest completed and active sessions</p>
            </div>
            <Link
              href="/mechanic/sessions"
              className="inline-flex items-center justify-center rounded-lg border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-300 transition-colors hover:border-blue-400 hover:text-blue-200 sm:px-5"
            >
              View All →
            </Link>
          </div>

          {loadingRecentSessions ? (
            // Loading skeletons for recent sessions
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 animate-pulse">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-slate-700"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-slate-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-slate-700 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
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
                        <div className="mb-2">
                          <PresenceChip
                            name={session.customer_name}
                            status={session.status === 'live' || session.status === 'waiting' ? 'online' : 'offline'}
                            size="sm"
                            showName={true}
                          />
                        </div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm text-slate-400 capitalize">{session.session_type}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500">
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

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <StatusBadge status={session.status as any} size="md" showIcon={true} />

                      <Link
                        href={`/mechanic/session/${session.id}`}
                        className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-center text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/20 sm:w-auto"
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
    </>
  )
}
