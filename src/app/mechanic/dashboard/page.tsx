'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, MessageSquare, Video, FileText, User, Calendar, AlertTriangle, RefreshCw, Bell, CheckCheck } from 'lucide-react'
import OnShiftToggle from '@/components/mechanic/OnShiftToggle'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PresenceChip } from '@/components/ui/PresenceChip'
import { ConnectionQuality } from '@/components/ui/ConnectionQuality'
import PriorityBadge from '@/components/mechanic/PriorityBadge'
import { createClient } from '@/lib/supabase'
import RecentSessions from '@/components/dashboard/RecentSessions'
import SessionCard from '@/components/sessions/SessionCard'
import { ActiveSessionBanner } from '@/components/shared/ActiveSessionBanner'
import MechanicSessionDetailsModal from '@/components/mechanic/MechanicSessionDetailsModal'
import { ensureNotificationPermission } from '@/lib/browserNotifications'
import { primeAudio } from '@/lib/notificationSound'
import { triggerMechanicNewRequestAlert } from '@/lib/newRequestAlertsBridge'
import { useNewRequestsIndicator } from '@/state/newRequestsIndicator'
import { setTabNewRequests } from '@/lib/tabAttention'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { getMechanicType, getDashboardTitle, isOwnerOperator, canAccessEarnings, MechanicType } from '@/types/mechanic'
import { useMechanicActiveSession } from '@/contexts/MechanicActiveSessionContext'

// --- Realtime custom event types for TS ---
declare global {
  interface WindowEventMap {
    'mechanic:assignments:update': CustomEvent<{
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      assignmentId?: string
      status?: string
      sessionId?: string
      vehicleLabel?: string | null
      concernSummary?: string | null
      customerName?: string | null
    }>;
    'mechanic:sessions:update': CustomEvent<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; sessionId?: string; status?: string }>;
    'mechanic:quotes:update': CustomEvent<{ eventType: 'INSERT' | 'UPDATE' | 'DELETE'; quoteId?: string }>;
  }
}

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

type QueueSession = {
  id: string;
  status: string;
  plan: string | null;
  type: 'chat' | 'video' | 'diagnostic' | string | null;
  created_at: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  customer_id: string | null;
};

type QueueAssignment = {
  id: string;
  status: 'queued' | 'offered' | 'accepted' | 'joined' | 'in_progress' | 'ended' | 'cancelled';
  mechanic_id: string | null;
  session_id: string;
  created_at: string;
  updated_at: string | null;
  match_score?: number | null;
  match_reasons?: string[] | null;
  priority?: string | null;
  expires_at?: string | null;
  metadata?: {
    match_type?: 'targeted' | 'broadcast';
    is_brand_specialist?: boolean;
    is_local_match?: boolean;
    [key: string]: any;
  } | null;
  session?: QueueSession; // joined session (API uses 'session' singular)
};

type QueueResponse = {
  unassigned: QueueAssignment[];
  mine: QueueAssignment[];
  total: number;
};

export default function MechanicDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notification = searchParams.get('notification')

  // ✅ Phase 2: Use context for active session awareness (complementary to dashboard API)
  // Context provides single source of truth for THE active session (for banner)
  // Dashboard API provides list of ALL active sessions (for display)
  const { activeSession: contextActiveSession, hasActiveSession } = useMechanicActiveSession()

  const [loading, setLoading] = useState(true)
  const [checkingTier, setCheckingTier] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mechanicUserId, setMechanicUserId] = useState<string | null>(null)
  const [mechanicType, setMechanicType] = useState<MechanicType | null>(null)
  const [mechanicData, setMechanicData] = useState<any>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [queue, setQueue] = useState<{
    unassigned: QueueAssignment[]
    mine: QueueAssignment[]
    total: number
  }>({ unassigned: [], mine: [], total: 0 })
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

  // Standalone queue fetcher
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/mechanic/queue', { cache: 'no-store' });
      const d = await res.json();

      console.log('[MechanicDashboard] Queue API →', {
        total: d?.total,
        unassigned: d?.unassigned?.length ?? 0,
        mine: d?.mine?.length ?? 0,
        sampleUnassigned: d?.unassigned?.[0]?.session_id,
        sampleMine: d?.mine?.[0]?.session_id,
      });

      // IMPORTANT: new shape
      setQueue({
        unassigned: Array.isArray(d?.unassigned) ? d.unassigned : [],
        mine: Array.isArray(d?.mine) ? d.mine : [],
        total: typeof d?.total === 'number' ? d.total : ((d?.unassigned?.length ?? 0) + (d?.mine?.length ?? 0)),
      });

      return d;
    } catch (e) {
      console.error('[MechanicDashboard] Failed to fetch queue', e);
      setQueue({ unassigned: [], mine: [], total: 0 });
      return null;
    }
  }, [])

  // Dedicated refetch function for realtime updates
  const refetchAllData = useCallback(async () => {
    console.log('[MechanicDashboard] 🔄 Real-time update detected → refetching queue…')

    // Refetch queue
    try {
      await fetchQueue()
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
  }, [])

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

        // Get mechanic details with type classification fields
        const { data: mechanic, error: mechanicError } = await supabase
          .from('mechanics')
          .select('id, user_id, service_tier, account_type, workshop_id, partnership_type')
          .eq('user_id', session.user.id)
          .single()

        if (mechanicError || !mechanic) {
          console.log('[MechanicDashboard] No mechanic profile found, redirecting...')
          await supabase.auth.signOut()
          router.replace('/mechanic/login')
          return
        }

        // Determine mechanic type
        const type = getMechanicType(mechanic)

        setMechanicUserId(mechanic.id)
        setMechanicData(mechanic)
        setMechanicType(type)
        setIsAuthenticated(true)
        setAuthChecking(false)

        console.log('[MechanicDashboard] Mechanic authenticated:', {
          userId: session.user.id,
          mechanicId: mechanic.id,
          serviceTier: mechanic.service_tier,
          mechanicType: type
        })

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
  // Poll every 5 seconds to detect ended sessions quickly
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
      // Fetch immediately
      fetchActiveSessions()

      // Poll every 30 seconds to reduce load (reduced from 5s due to slow API response times)
      const intervalId = setInterval(fetchActiveSessions, 30000)

      return () => {
        clearInterval(intervalId)
      }
    }
  }, [isAuthenticated, checkingTier])

  // Fetch pending requests - CRITICAL: Show available requests mechanics can accept
  useEffect(() => {
    const loadQueue = async () => {
      setLoadingRequests(true)
      try {
        await fetchQueue()
      } catch (err) {
        console.error('[MechanicDashboard] Failed to fetch queue:', err)
      } finally {
        setLoadingRequests(false)
      }
    }

    if (isAuthenticated && !checkingTier) {
      loadQueue()
    }
  }, [isAuthenticated, checkingTier, fetchQueue])

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
        setQueue(prev => ({
          unassigned: prev.unassigned.filter(q => q.id !== assignmentId),
          mine: prev.mine.filter(q => q.id !== assignmentId),
          total: Math.max(0, prev.total - 1)
        }))
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

  // Listen to custom events emitted by MechanicRealtimeMount (in layout)
  useEffect(() => {
    function onAssignUpdate(e: CustomEvent) {
      const detail = e.detail
      console.log('[MechanicDashboard] 🔔 Realtime assignment update received', detail);
      console.log('[MechanicDashboard] 🔄 Real-time update detected → refetching queue…');

      // Always refresh queue/stats
      fetchQueue();

      // Only toast on *new* queued items
      if (detail.eventType === 'INSERT' && detail.status === 'queued') {
        triggerMechanicNewRequestAlert({
          assignmentId: detail.assignmentId,
          sessionId: detail.sessionId,
          vehicleLabel: detail.vehicleLabel ?? null,
          concernSummary: detail.concernSummary ?? null,
          customerName: detail.customerName ?? null,
        })
      }
    }

    function onSessionUpdate(e: CustomEvent) {
      console.log('[MechanicDashboard] 🔔 Realtime session update received', e.detail);
      fetchQueue();

      // Also refresh active sessions when session updates occur
      const fetchActiveSessions = async () => {
        try {
          const response = await fetch('/api/mechanic/active-sessions')
          if (response.ok) {
            const data = await response.json()
            setActiveSessions(data.sessions || [])
          }
        } catch (err) {
          console.error('[MechanicDashboard] Failed to refresh active sessions:', err)
        }
      }
      fetchActiveSessions();
    }

    // Listen for session-ended event from ActiveSessionBanner
    function onSessionEnded(e: Event) {
      console.log('[MechanicDashboard] 🔔 Session ended event received, refreshing active sessions');
      setActiveSessions([]); // Clear immediately

      // Refetch to confirm
      const fetchActiveSessions = async () => {
        try {
          const response = await fetch('/api/mechanic/active-sessions')
          if (response.ok) {
            const data = await response.json()
            setActiveSessions(data.sessions || [])
          }
        } catch (err) {
          console.error('[MechanicDashboard] Failed to refresh active sessions:', err)
        }
      }
      fetchActiveSessions();
    }

    window.addEventListener('mechanic:assignments:update', onAssignUpdate as EventListener);
    window.addEventListener('mechanic:sessions:update', onSessionUpdate as EventListener);
    window.addEventListener('session-ended', onSessionEnded);

    return () => {
      window.removeEventListener('mechanic:assignments:update', onAssignUpdate as EventListener);
      window.removeEventListener('mechanic:sessions:update', onSessionUpdate as EventListener);
      window.removeEventListener('session-ended', onSessionEnded);
    };
  }, [fetchQueue])

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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {mechanicType ? getDashboardTitle(mechanicType) : 'Mechanic Dashboard'}
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1">
                {mechanicType === MechanicType.INDEPENDENT_WORKSHOP
                  ? 'Manage your diagnostic sessions and workshop operations'
                  : 'Manage your sessions and quotes'}
              </p>
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
        ) : queue.unassigned.length > 0 ? (
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
                  {queue.unassigned.length} session{queue.unassigned.length > 1 ? 's' : ''} waiting for a mechanic
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {queue.unassigned.map((item) => {
                const s = item.session; // <- singular to match API
                if (!s) return null;

                return (
                  <div key={item.id} className="space-y-2">
                    {/* Priority Badge - Show match score and reasons */}
                    <PriorityBadge
                      matchScore={item.match_score}
                      matchReasons={item.match_reasons}
                      priority={item.priority}
                      metadata={item.metadata}
                    />

                    <SessionCard
                      sessionId={item.session_id}
                      type={s.type as any}
                      status={s.status as any}
                      plan={s.plan}
                      createdAt={s.created_at}
                      partnerName="Customer"
                      partnerRole="customer"
                      userRole="mechanic"
                      showViewButton={true}
                      onViewDetails={(id) => {
                        setSelectedSessionId(id)
                        setShowDetailsModal(true)
                      }}
                      cta={{
                        action: 'Accept Request',
                        onClick: async () => {
                          await handleAcceptAssignment(item.id, s.type || 'chat')
                        }
                      }}
                    />
                  </div>
                );
              })}
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

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${mechanicData && canAccessEarnings(mechanicData) ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 sm:gap-6 mb-6 sm:mb-8`}>
          {loadingStats ? (
            // Loading skeletons for stats cards
            <>
              {(mechanicData && canAccessEarnings(mechanicData) ? [1, 2, 3, 4] : [1, 2]).map((i) => (
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
                <div className="text-sm text-slate-400 mb-1">Approved Today</div>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.approved_today ?? 0}
                </div>
              </div>
              {/* ✅ CRITICAL: Only show quotes and revenue for mechanics who can access earnings (virtual + independent) */}
              {mechanicData && canAccessEarnings(mechanicData) && (
                <>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6">
                    <div className="text-sm text-slate-400 mb-1">Active Quotes</div>
                    <div className="text-3xl font-bold text-blue-400">
                      {stats?.active_quotes ?? 0}
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
            </>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="mt-8">
          <RecentSessions
            userRole="mechanic"
            limit={3}
            hidePricing={mechanicData ? !canAccessEarnings(mechanicData) : false}
          />
        </div>
      </div>
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedSessionId && (
        <MechanicSessionDetailsModal
          sessionId={selectedSessionId}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedSessionId(null)
          }}
        />
      )}
    </>
  )
}
