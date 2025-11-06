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
import { ensureNotificationPermission } from '@/lib/browserNotifications'
import { primeAudio } from '@/lib/notificationSound'
import { onNewSessionRequest } from '@/lib/newRequestAlerts'
import { useNewRequestsIndicator } from '@/state/newRequestsIndicator'
import { setTabNewRequests } from '@/lib/tabAttention'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

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

  // Tier 4: Visual indicators
  const newRequestCount = useNewRequestsIndicator((state) => state.count)
  const clearNewRequestCount = useNewRequestsIndicator((state) => state.clear)

  // Feature flags from database (admin-controlled)
  const { flags } = useFeatureFlags()

  // Log flags on initial load (silent after cache)
  useEffect(() => {
    console.log('[MechanicDashboard] Feature flags loaded:', {
      mech_new_request_alerts: flags.mech_new_request_alerts,
      mech_audio_alerts: flags.mech_audio_alerts,
      mech_browser_notifications: flags.mech_browser_notifications,
      mech_visual_indicators: flags.mech_visual_indicators,
      allFlags: flags
    })
  }, [flags])

  const [loadingStats, setLoadingStats] = useState(true)
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

  // Initialize notification system (Tiers 2 & 3)
  useEffect(() => {
    if (!isAuthenticated) return

    // Tier 3: Request browser notification permission
    ensureNotificationPermission()

    // Tier 2: Prime audio on first user interaction
    const enableAudio = () => primeAudio()
    window.addEventListener('click', enableAudio, { once: true })
    window.addEventListener('touchstart', enableAudio, { once: true })

    return () => {
      window.removeEventListener('click', enableAudio)
      window.removeEventListener('touchstart', enableAudio)
    }
  }, [isAuthenticated])

  // Handle Accept Now button from toast (Tier 1)
  useEffect(() => {
    const handler = (e: Event) => {
      const requestId = (e as CustomEvent<string>).detail
      console.log('[MechanicDashboard] Accept from toast:', requestId)
      handleAcceptAssignment(requestId, 'chat') // Will be determined by queue item
    }

    window.addEventListener('mechanic-accept-request', handler as EventListener)
    return () => window.removeEventListener('mechanic-accept-request', handler as EventListener)
  }, [])

  // Update tab title when request count changes (Tier 4)
  useEffect(() => {
    if (flags.mech_visual_indicators) {
      setTabNewRequests(newRequestCount)
    }
  }, [newRequestCount, flags.mech_visual_indicators])

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
      setError(null)

      try {
        console.log('[MechanicDashboard] Fetching dashboard stats...')
        const response = await fetch('/api/mechanic/dashboard/stats')

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data.stats)
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

      // Refetch stats
      try {
        const statsResponse = await fetch('/api/mechanic/dashboard/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
          console.log('[MechanicDashboard] ✓ Refetched stats')
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
        async (payload) => {
          console.log('[MechanicDashboard] Session assignment change detected:', payload)
          console.log('[MechanicDashboard] Event type:', payload.eventType, 'New record:', payload.new)

          // PHASE 3A: Trigger alerts when new assignment becomes 'queued'
          // This replaces the broadcast-based alert system
          // CRITICAL FIX: Supabase returns lowercase event types ('insert', 'update')
          const eventType = payload.eventType?.toUpperCase()
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const newRecord = payload.new as any
            const oldRecord = payload.old as any

            console.log('[MechanicDashboard] Checking if should alert:', {
              eventType,
              oldStatus: oldRecord?.status,
              newStatus: newRecord?.status,
              alertsEnabled: flags.mech_new_request_alerts
            })

            // Only alert when status TRANSITIONS TO 'queued' (not already queued)
            const isNewlyQueued = newRecord?.status === 'queued' && oldRecord?.status !== 'queued'

            console.log('[MechanicDashboard] Should alert?', {
              isNewlyQueued,
              flagsCheck: flags.mech_new_request_alerts,
              willAlert: isNewlyQueued && flags.mech_new_request_alerts
            })

            // Trigger alert for newly queued assignments (if flag enabled)
            if (isNewlyQueued && flags.mech_new_request_alerts) {
              console.log('[MechanicDashboard] 🔔 Triggering alert for queued assignment:', newRecord.id)

              // Fetch session details for alert
              try {
                const { data: session, error: sessionError } = await supabase
                  .from('sessions')
                  .select('id, type, intake_id')
                  .eq('id', newRecord.session_id)
                  .single()

                if (sessionError) {
                  console.error('[MechanicDashboard] Failed to fetch session:', sessionError)
                  return
                }

                if (session) {
                  console.log('[MechanicDashboard] Fetched session:', session)

                  // Fetch intake for customer/vehicle info
                  const { data: intake, error: intakeError } = await supabase
                    .from('intakes')
                    .select('name, year, make, model, vin, concern')
                    .eq('id', session.intake_id)
                    .single()

                  if (intakeError) {
                    console.error('[MechanicDashboard] Failed to fetch intake:', intakeError)
                    // Continue with minimal info
                  }

                  const vehicleSummary = intake?.vin
                    ? `VIN: ${intake.vin}`
                    : `${intake?.year || ''} ${intake?.make || ''} ${intake?.model || ''}`.trim()

                  console.log('[MechanicDashboard] 🔔 Calling onNewSessionRequest with:', {
                    requestId: newRecord.id,
                    customerName: intake?.name || 'Customer',
                    vehicle: vehicleSummary || 'Vehicle'
                  })

                  // Trigger multi-layer alert system
                  onNewSessionRequest({
                    requestId: newRecord.id,
                    customerName: intake?.name || 'Customer',
                    vehicle: vehicleSummary || 'Vehicle',
                    concern: intake?.concern || '',
                  }, flags)
                }
              } catch (error) {
                console.error('[MechanicDashboard] Error fetching assignment details:', error)
              }
            }
          }

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

    // PHASE 3A: Removed broadcast channel - now using postgres_changes above
    // postgres_changes is more reliable on Render (survives container restarts)

    return () => {
      console.log('[MechanicDashboard] Cleaning up subscriptions')
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
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
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Available Sessions</h2>
                  {newRequestCount > 0 && flags.mech_visual_indicators && (
                    <span
                      onClick={clearNewRequestCount}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse cursor-pointer hover:bg-orange-500/30 transition"
                      title="Click to dismiss"
                    >
                      {newRequestCount} new
                    </span>
                  )}
                </div>
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
                  urgent={item.urgent}
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
                <div className="text-3xl font-bold text-blue-400">
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
                <div className="text-3xl font-bold text-blue-600">
                  ${stats?.revenue_this_month?.toFixed(2) ?? '0.00'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="mt-8">
          <RecentSessions userRole="mechanic" limit={3} />
        </div>
      </div>
      </div>
    </>
  )
}
