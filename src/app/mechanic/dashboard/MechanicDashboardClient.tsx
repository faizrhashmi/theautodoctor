'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CalendarClock,
  DollarSign,
  Loader2,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Eye,
  History,
  FileText,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { SessionRequest } from '@/types/session'
import type { SessionStatus } from '@/types/session'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import EnhancedRequestDetailModal from '@/components/mechanic/EnhancedRequestDetailModal'
// import SessionHistoryModal from '@/components/mechanic/SessionHistoryModal'

const MECHANIC_SHARE = 0.7

// Local pricing config to avoid Stripe env dependencies
type PlanKey = 'chat10' | 'video15' | 'diagnostic'
const PLAN_KEYS: PlanKey[] = ['chat10', 'video15', 'diagnostic']

const PLAN_PRICING: Record<PlanKey, number> = {
  chat10: 999,      // $9.99
  video15: 2999,    // $29.99
  diagnostic: 4999, // $49.99
}

const SESSION_STATUS_VALUES: SessionStatus[] = ['scheduled', 'waiting', 'live', 'completed', 'cancelled']

type SessionRequestRow = Database['public']['Tables']['session_requests']['Row']
type SessionRow = Pick<
  Database['public']['Tables']['sessions']['Row'],
  'id' | 'status' | 'plan' | 'type' | 'scheduled_start' | 'scheduled_end' | 'scheduled_for' | 'started_at' | 'ended_at' | 'duration_minutes' | 'metadata'
>

type MechanicDashboardSession = {
  id: string
  customerName: string
  plan: string | null
  sessionType: SessionRow['type']
  status: SessionStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number | null
}

type MechanicDashboardClientProps = {
  mechanic: {
    id: string
    name: string
    email: string
    stripeConnected: boolean
    payoutsEnabled: boolean
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export default function MechanicDashboardClient({ mechanic }: MechanicDashboardClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const mechanicId = mechanic.id

  console.log('[MECHANIC DASHBOARD CLIENT] Component rendered, mechanicId:', mechanicId)

  // NEW STATE STRUCTURE: 4 clear sections
  const [newRequests, setNewRequests] = useState<any[]>([]) // Pending requests (not accepted)
  const [activeSessions, setActiveSessions] = useState<any[]>([]) // Accepted but not started
  const [upcomingSessions, setUpcomingSessions] = useState<MechanicDashboardSession[]>([]) // Future scheduled
  const [sessionHistory, setSessionHistory] = useState<MechanicDashboardSession[]>([]) // Completed + Cancelled

  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [showStuckRequestError, setShowStuckRequestError] = useState(false)
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)
  const [acceptedSessionId, setAcceptedSessionId] = useState<string | null>(null)
  const [acceptedCustomerName, setAcceptedCustomerName] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  // Temporarily disabled for build
  // const [selectedHistorySession, setSelectedHistorySession] = useState<MechanicDashboardSession | null>(null)

  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  // Debug state
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [isLoadingDebug, setIsLoadingDebug] = useState(false)

  // Refresh and connection state
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const [isForceClosing, setIsForceClosing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(true)

  // Pagination state - show 10 items initially, expand by 10
  const ITEMS_PER_PAGE = 10
  const [visibleNewRequests, setVisibleNewRequests] = useState(ITEMS_PER_PAGE)
  // Active Sessions: Show only 1 (the most recent) - no pagination needed
  const [visibleUpcomingSessions, setVisibleUpcomingSessions] = useState(ITEMS_PER_PAGE)
  const [visibleHistoryItems, setVisibleHistoryItems] = useState(ITEMS_PER_PAGE)

  const requestsChannelRef = useRef<RealtimeChannel | null>(null)
  const sessionsChannelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const mapRowToRequest = useCallback(
    (row: SessionRequestRow & { sessionId?: string | null }): SessionRequest => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name ?? 'Customer',
      customerEmail: row.customer_email ?? undefined,
      sessionType: row.session_type,
      planCode: row.plan_code,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at ?? undefined,
      mechanicId: row.mechanic_id ?? undefined,
      sessionId: row.sessionId ?? undefined,
    }),
    []
  )

  const upsertRequest = useCallback(
    (row: SessionRequestRow) => {
      setNewRequests((prev) => {
        if (row.status !== 'pending') {
          return prev.filter((item) => item.id !== row.id)
        }

        const mapped = mapRowToRequest(row)
        const existingIndex = prev.findIndex((item) => item.id === row.id)
        const next = existingIndex >= 0 ? [...prev] : [...prev, mapped]

        if (existingIndex >= 0) {
          next[existingIndex] = mapped
        } else {
          next[next.length - 1] = mapped
        }

        return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      })
    },
    [mapRowToRequest]
  )

  const removeRequest = useCallback((id: string) => {
    setNewRequests((prev) => prev.filter((item) => item.id !== id))
  }, [])

  // Fetch NEW REQUESTS (pending, not accepted by anyone)
  const fetchNewRequests = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!mechanicId) return

      if (!options?.silent) {
        setIsLoadingRequests(true)
      }
      setRequestsError(null)

      try {
        // Fetch both 'pending' and 'unattended' requests
        // 'unattended' = requests that timed out but customers are still waiting
        const [pendingResponse, unattendedResponse] = await Promise.all([
          fetch('/api/mechanics/requests?status=pending', {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }),
          fetch('/api/mechanics/requests?status=unattended', {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }),
        ])

        const pendingBody = (await pendingResponse
          .json()
          .catch(() => null)) as { requests?: SessionRequestRow[] | null } | null

        const unattendedBody = (await unattendedResponse
          .json()
          .catch(() => null)) as { requests?: SessionRequestRow[] | null } | null

        if (!pendingResponse.ok && !unattendedResponse.ok) {
          console.error(
            '[MECHANIC DASHBOARD] Failed to load new requests',
            pendingResponse.status,
            pendingBody ?? {}
          )
          if (!isMountedRef.current) return
          setRequestsError('Unable to load new requests right now.')
          setNewRequests([])
          return
        }

        if (!isMountedRef.current) return

        // Combine pending and unattended requests
        const pendingRequests = Array.isArray(pendingBody?.requests) ? pendingBody.requests : []
        const unattendedRequests = Array.isArray(unattendedBody?.requests) ? unattendedBody.requests : []
        const allRequests = [...pendingRequests, ...unattendedRequests]

        const mapped = allRequests.map(mapRowToRequest)

        setNewRequests(
          mapped.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        )
      } catch (error) {
        console.error('[MECHANIC DASHBOARD] Failed to load new requests', error)
        if (!isMountedRef.current) return
        setRequestsError('Unable to load new requests right now.')
        setNewRequests([])
      } finally {
        if (!options?.silent && isMountedRef.current) {
          setIsLoadingRequests(false)
        }
      }
    },
    [mechanicId, mapRowToRequest]
  )

  // Fetch ACTIVE SESSIONS - query sessions table directly (source of truth)
  // Shows: waiting (accepted but not started) + live (in progress)
  const fetchActiveSessions = useCallback(
    async () => {
      if (!mechanicId) return

      console.log('[fetchActiveSessions] Fetching active sessions for mechanic:', mechanicId)

      try {
        // Query sessions table for active work (waiting + live)
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id, status, type, plan, customer_user_id, created_at, started_at, metadata, intake_id')
          .eq('mechanic_id', mechanicId)
          .in('status', ['waiting', 'live']) // Both waiting (not started) and live (in progress)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[fetchActiveSessions] Error:', error)
          if (!isMountedRef.current) return
          setActiveSessions([])
          return
        }

        // CRITICAL FIX: Also fetch accepted requests that don't have sessions yet
        // This prevents "hidden" accepted requests from blocking mechanics
        const { data: acceptedRequests, error: requestsError } = await supabase
          .from('session_requests')
          .select('id, customer_id, customer_name, customer_email, session_type, plan_code, created_at, accepted_at, metadata')
          .eq('mechanic_id', mechanicId)
          .eq('status', 'accepted')
          .order('accepted_at', { ascending: false })

        if (requestsError) {
          console.error('[fetchActiveSessions] Error fetching accepted requests:', requestsError)
        }

        console.log('[fetchActiveSessions] Found sessions:', sessions?.length || 0)
        console.log('[fetchActiveSessions] Found accepted requests:', acceptedRequests?.length || 0)

        if (!isMountedRef.current) return

        // Enrich with customer info and intake data
        const enriched = await Promise.all(
          (sessions || []).map(async (session) => {
            const metadata = (session.metadata || {}) as Record<string, unknown>
            let customerName = 'Customer'

            // Try to get customer name from metadata
            if (metadata.customer_name) customerName = String(metadata.customer_name)
            else if (metadata.customerName) customerName = String(metadata.customerName)

            // Get intake data if available
            let intakeData: any = null
            if (session.intake_id) {
              const { data: intake } = await supabase
                .from('intakes')
                .select('*')
                .eq('id', session.intake_id)
                .maybeSingle()

              intakeData = intake
            }

            // Get files
            let files: any[] = []
            const { data: sessionFiles } = await supabase
              .from('session_files')
              .select('id, file_name, file_size, file_type, file_url, created_at, description')
              .eq('session_id', session.id)
              .order('created_at', { ascending: false })

            files = sessionFiles || []

            return {
              id: session.id, // This is the session ID
              sessionId: session.id,
              customerName,
              customerId: session.customer_user_id,
              sessionType: session.type,
              planCode: session.plan,
              status: session.status,
              createdAt: session.created_at,
              acceptedAt: session.created_at, // When session was created = when it was accepted
              isLive: session.status === 'live',
              intake: intakeData,
              files,
            }
          })
        )

        // CRITICAL FIX: Merge accepted requests into active sessions
        // These are requests the mechanic accepted but customer hasn't joined yet
        const enrichedRequests = (acceptedRequests || []).map((request) => ({
          id: request.id, // This is the request ID (not session ID)
          sessionId: null, // No session created yet
          customerName: request.customer_name || request.customer_email || 'Customer',
          customerId: request.customer_id,
          sessionType: request.session_type,
          planCode: request.plan_code,
          status: 'accepted', // Request status, not session status
          createdAt: request.created_at,
          acceptedAt: request.accepted_at,
          isLive: false, // Accepted requests are not live yet
          intake: null,
          files: [],
          isAcceptedRequest: true, // Flag to identify this is a request, not a session
        }))

        const combined = [...enriched, ...enrichedRequests]

        console.log('[fetchActiveSessions] Enriched sessions:', enriched.length)
        console.log('[fetchActiveSessions] Enriched accepted requests:', enrichedRequests.length)
        console.log('[fetchActiveSessions] Total active items:', combined.length)
        setActiveSessions(combined)
      } catch (error) {
        console.error('[fetchActiveSessions] Failed to load active sessions', error)
        if (!isMountedRef.current) return
        setActiveSessions([])
      }
    },
    [mechanicId, supabase]
  )

  // Manual refresh function (defined before loadSessions to avoid circular dependency)
  const handleManualRefresh = useCallback(async () => {
    console.log('[MECHANIC DASHBOARD] Manual refresh triggered')
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchNewRequests({ silent: true }),
        fetchActiveSessions()
      ])
      setLastRefreshTime(new Date())
    } catch (error) {
      console.error('[MECHANIC DASHBOARD] Manual refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchNewRequests, fetchActiveSessions])

  const mapSessionRow = useCallback(
    (row: SessionRow): MechanicDashboardSession => {
      const status = normalizeSessionStatus(row.status)
      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      const nameCandidate = [
        metadata.customer_name,
        metadata.customerName,
        metadata.customer_full_name,
        metadata.customerFullName,
        metadata.full_name,
        metadata.fullName,
      ].find((value) => typeof value === 'string' && value.trim().length > 0)

      const scheduledStart = row.scheduled_start ?? row.scheduled_for ?? null
      const scheduledEnd = row.scheduled_end ?? null
      const startedAt = row.started_at ?? null
      const endedAt = row.ended_at ?? null

      const computedDuration =
        row.duration_minutes ??
        diffInMinutes(startedAt, endedAt) ??
        diffInMinutes(scheduledStart, scheduledEnd)

      return {
        id: row.id,
        customerName: typeof nameCandidate === 'string' ? nameCandidate : 'Customer',
        plan: row.plan ?? null,
        sessionType: row.type,
        status,
        scheduledStart,
        scheduledEnd,
        startedAt,
        endedAt,
        durationMinutes: computedDuration,
      }
    },
    []
  )

  // Load incoming and accepted requests
  useEffect(() => {
    if (!mechanicId) {
      setNewRequests([])
      setActiveSessions([])
      setIsLoadingRequests(false)
      return
    }

    void fetchNewRequests()
    void fetchActiveSessions()

    const channel = supabase
      .channel('session_requests_feed', { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_requests' }, (payload) => {
        const row = payload.new as SessionRequestRow | null
        if (row) {
          upsertRequest(row)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session_requests' }, (payload) => {
        const row = payload.new as SessionRequestRow | null
        if (row) {
          upsertRequest(row)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'session_requests' }, (payload) => {
        const row = payload.old as SessionRequestRow | undefined
        if (row?.id) {
          removeRequest(row.id)
        }
      })
      .on('broadcast', { event: 'new_request' }, ({ payload }) => {
        const row = extractSessionRequestRow(payload)
        if (row) {
          upsertRequest(row)
        } else {
          void fetchNewRequests({ silent: true })
        }
      })
      .on('broadcast', { event: 'request_accepted' }, ({ payload }) => {
        const id = typeof payload?.id === 'string' ? payload.id : null
        if (id) removeRequest(id)
        // Reload active sessions to show newly accepted
        void fetchActiveSessions()
      })
      .on('broadcast', { event: 'request_cancelled' }, () => {
        // Reload both lists - cancelled request goes back to pending
        void fetchNewRequests({ silent: true })
        void fetchActiveSessions()
      })

    channel.subscribe((status) => {
      console.log('[MECHANIC DASHBOARD] Realtime channel status:', status)
      if (status === 'SUBSCRIBED') {
        setRealtimeConnected(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setRealtimeConnected(false)
        setRequestsError('Realtime updates unavailable. Refresh to see new requests.')
      }
    })

    requestsChannelRef.current = channel

    return () => {
      void channel.unsubscribe()
      supabase.removeChannel(channel)
      requestsChannelRef.current = null
    }
  }, [fetchNewRequests, fetchActiveSessions, mechanicId, removeRequest, supabase, upsertRequest])

  const loadSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      console.log('[loadSessions] Starting, mechanicId:', mechanicId)
      if (!mechanicId) return

      if (!options?.silent) {
        setIsLoadingSessions(true)
      }
      setSessionsError(null)

      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, status, plan, type, scheduled_start, scheduled_end, scheduled_for, started_at, ended_at, duration_minutes, metadata')
          .eq('mechanic_id', mechanicId)
          .order('scheduled_start', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })

        console.log('[loadSessions] Query result:', { dataCount: data?.length, error })

        // FIX: Removed isMountedRef check - React 18 StrictMode causes false unmount detection
        // If we have data from the query, we should update state regardless

        if (error) {
          console.error('Failed to load mechanic sessions', error)
          setSessionsError('Unable to load your sessions right now.')
          setUpcomingSessions([])
          setSessionHistory([])
        } else if (data) {
          const mapped = data.map(mapSessionRow)
          console.log('[loadSessions] Mapped sessions:', mapped.length)
          console.log('[loadSessions] First 3 sessions:', mapped.slice(0, 3))

          // Filter sessions by category
          const now = new Date()

          // Live/Waiting sessions (in progress) - add to active sessions as session objects
          const liveSessions = mapped
            .filter((session) => session.status === 'live' || session.status === 'waiting')
            .map((session) => ({
              id: session.id,
              customerId: '', // Not available from session, but not needed for display
              customerName: session.customerName,
              customerEmail: undefined,
              sessionType: session.sessionType,
              planCode: session.plan ?? 'unknown',
              status: session.status as any,
              createdAt: session.startedAt ?? session.scheduledStart ?? new Date().toISOString(),
              acceptedAt: session.startedAt ?? session.scheduledStart,
              mechanicId: mechanicId,
              sessionId: session.id, // Already a started session
              isLive: session.status === 'live', // FIXED: Derive from actual status
              isWaiting: session.status === 'waiting', // NEW: Flag for waiting sessions
              isAcceptedRequest: false, // This is a real session, not just an accepted request
            }))

          // Merge live sessions with accepted requests (from fetchActiveSessions)
          // Keep existing accepted requests and add any new live sessions
          setActiveSessions((prev) => {
            // Filter out any duplicates (sessions that were accepted requests but are now live)
            const existingAccepted = prev.filter(item => item.isAcceptedRequest === true)
            const liveSessionIds = new Set(liveSessions.map(s => s.sessionId))
            const filteredAccepted = existingAccepted.filter(item => !liveSessionIds.has(item.sessionId))

            // FIXED: Combine and sort to prioritize actionable work
            // 1. Sessions with sessionId come first (they're actionable)
            // 2. Within each group, newest first
            return [...liveSessions, ...filteredAccepted].sort((a, b) => {
              // Prioritize items with sessionId (real sessions over accepted-request stubs)
              if (a.sessionId && !b.sessionId) return -1
              if (!a.sessionId && b.sessionId) return 1

              // Both have or both don't have sessionId - sort by newest first
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })
          })

          // Upcoming: Future scheduled sessions only
          const upcoming = mapped
            .filter((session) => {
              if (session.status !== 'scheduled') return false
              if (!session.scheduledStart) return false
              return new Date(session.scheduledStart) > now
            })
            .sort((a, b) => {
              const aTime = toTimeValue(a.scheduledStart)
              const bTime = toTimeValue(b.scheduledStart)
              return aTime - bTime
            })

          // Session History: Completed AND Cancelled sessions
          const history = mapped
            .filter((session) => session.status === 'completed' || session.status === 'cancelled')
            .sort((a, b) => toTimeValue(b.endedAt ?? b.scheduledEnd) - toTimeValue(a.endedAt ?? a.scheduledEnd))

          console.log('[loadSessions] Session history filtered:', history.length)
          console.log('[loadSessions] First 3 history:', history.slice(0, 3))

          setUpcomingSessions(upcoming)
          setSessionHistory(history)
          console.log('[loadSessions] State updated - upcoming:', upcoming.length, 'history:', history.length)
        }

        if (!options?.silent && isMountedRef.current) {
          setIsLoadingSessions(false)
        }
      } catch (err) {
        console.error('[MECHANIC DASHBOARD] Error loading sessions:', err)
        setSessionsError('Failed to load sessions. Please refresh the page.')
        setUpcomingSessions([])
        setSessionHistory([])
        if (!options?.silent && isMountedRef.current) {
          setIsLoadingSessions(false)
        }
      }
    },
    [mechanicId, mapSessionRow, supabase]
  )

  useEffect(() => {
    void loadSessions()

    if (!mechanicId) {
      return
    }

    const channel = supabase
      .channel(`mechanic_sessions_${mechanicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `mechanic_id=eq.${mechanicId}` },
        () => {
          void loadSessions({ silent: true })
        }
      )

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setSessionsError('Realtime updates unavailable for sessions. Refresh to see the latest schedule.')
      }
    })

    sessionsChannelRef.current = channel

    return () => {
      void channel.unsubscribe()
      supabase.removeChannel(channel)
      sessionsChannelRef.current = null
    }
  }, [loadSessions, mechanicId, supabase])

  // Auto-refresh fallback every 60 seconds
  useEffect(() => {
    const AUTO_REFRESH_INTERVAL = 60000 // 60 seconds

    const intervalId = setInterval(() => {
      if (!isRefreshing) {
        console.log('[MECHANIC DASHBOARD] Auto-refresh triggered')
        void handleManualRefresh()
      }
    }, AUTO_REFRESH_INTERVAL)

    return () => {
      clearInterval(intervalId)
    }
  }, [handleManualRefresh, isRefreshing])

  const acceptRequest = async (requestId: string) => {
    if (!mechanicId) {
      setRequestsError('Log in as a mechanic to accept requests.')
      return
    }

    setAcceptingRequestId(requestId)
    setRequestsError(null)

    try {
      const response = await fetch(`/api/mechanics/requests/${requestId}/accept`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string'
            ? (payload as any).error
            : null) ||
          (response.status === 409
            ? 'Another mechanic already accepted this request.'
            : 'Unable to accept this request right now.')
        throw new Error(message)
      }

      // Get request info
      if (payload && typeof payload === 'object' && 'request' in payload) {
        const request = (payload as { request?: { id?: string; sessionType?: string } }).request
        if (request?.id) {
          removeRequest(request.id)
        }
      }

      // Update selected request with session ID (enables "Start Session" button in modal)
      if (payload && typeof payload === 'object' && 'session' in payload) {
        const session = (payload as { session?: { id?: string } }).session
        if (session?.id && selectedRequest) {
          setSelectedRequest({
            ...selectedRequest,
            sessionId: session.id
          })
          console.log(`[accept-request] Request accepted, session ID:`, session.id)
        }
      }

      // FIX #3: HYDRATE activeSessions with sessionId from accept response
      // This makes the accepted request immediately actionable (enables "Start Session")
      if (payload && typeof payload === 'object' && 'session' in payload) {
        const session = (payload as { session?: { id?: string } }).session
        const request = (payload as { request?: { id?: string } }).request

        if (session?.id && request?.id) {
          console.log(`[accept-request] Hydrating activeSessions with sessionId:`, session.id)

          // Inject sessionId into the accepted request row in activeSessions
          setActiveSessions((prev) => prev.map((item) =>
            item.id === request.id && item.isAcceptedRequest
              ? { ...item, sessionId: session.id, isWaiting: true }
              : item
          ))
        }
      }

      // Remove from pending requests and reload sessions
      removeRequest(requestId)
      void loadSessions({ silent: true })
    } catch (error) {
      console.error('Accept request failed', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to accept this request right now.'
      setRequestsError(errorMessage)

      // Detect the specific "stuck accepted request" error
      if (errorMessage.includes('already have an accepted request')) {
        setShowStuckRequestError(true)
      }
    } finally {
      setAcceptingRequestId(null)
    }
  }

  const startSession = (sessionId: string, sessionType: string) => {
    const sessionPath = sessionType === 'chat' ? 'chat' : sessionType === 'video' ? 'video' : 'diagnostic'
    console.log(`[start-session] Navigating to ${sessionType} session:`, sessionId)
    window.location.href = `/${sessionPath}/${sessionId}`
  }

  const cancelRequest = async (requestId: string) => {
    if (!mechanicId) {
      setRequestsError('Log in as a mechanic to cancel requests.')
      return
    }

    setCancellingRequestId(requestId)
    setRequestsError(null)

    try {
      const response = await fetch(`/api/mechanics/requests/${requestId}/cancel`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string'
            ? (payload as any).error
            : null) || 'Unable to cancel this request.'
        throw new Error(message)
      }

      // Reload both lists - request goes back to pending (new requests)
      void fetchNewRequests({ silent: true })
      void fetchActiveSessions()
    } catch (error) {
      console.error('[MECHANIC DASHBOARD] Cancel request error:', error)
      setRequestsError(error instanceof Error ? error.message : 'Failed to cancel request')
    } finally {
      setCancellingRequestId(null)
    }
  }

  const earningsSummary = useMemo(() => {
    // Only count completed sessions for earnings (not cancelled)
    const completedOnly = sessionHistory.filter(s => s.status === 'completed')

    const rows = completedOnly.slice(0, 10).map((session) => ({
      id: session.id,
      date: session.endedAt ?? session.scheduledEnd ?? session.startedAt ?? session.scheduledStart,
      plan: session.plan,
      sessionType: session.sessionType,
      durationMinutes: session.durationMinutes,
      earningsCents: calculateEarningsCents(session.plan),
    }))

    const totalCents = completedOnly.reduce((sum, session) => {
      const value = calculateEarningsCents(session.plan)
      return value ? sum + value : sum
    }, 0)

    return { rows, totalCents }
  }, [sessionHistory])

  const stats = useMemo(() => {
    return {
      newRequests: newRequests.length,
      activeSessions: activeSessions.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: sessionHistory.filter(s => s.status === 'completed').length,
      totalEarnings: earningsSummary.totalCents,
    }
  }, [newRequests.length, activeSessions.length, upcomingSessions.length, sessionHistory, earningsSummary.totalCents])

  const fetchDebugData = async () => {
    setIsLoadingDebug(true)
    try {
      const response = await fetch('/api/debug/mechanic-requests', {
        method: 'GET',
        cache: 'no-store',
      })
      const data = await response.json()
      setDebugData(data)
      console.log('[DEBUG PANEL] Data loaded:', data)
    } catch (error) {
      console.error('[DEBUG PANEL] Failed to fetch debug data:', error)
      setDebugData({ error: 'Failed to load debug data' })
    } finally {
      setIsLoadingDebug(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/mechanics/logout', {
        method: 'POST',
      })
      // Redirect to mechanic login page
      window.location.href = '/mechanic/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Still redirect even if API call fails
      window.location.href = '/mechanic/login'
    }
  }

  const handleForceCloseAll = async () => {
    const activeCount = activeSessions.length

    if (activeCount === 0) {
      alert('✓ You have no active sessions to close.')
      return
    }

    const confirmed = confirm(
      `⚠️ FORCE CLOSE ALL SESSIONS\n\n` +
      `This will immediately terminate ${activeCount} active session${activeCount > 1 ? 's' : ''}:\n` +
      `• Sessions will be cancelled\n` +
      `• Accepted requests will be cancelled\n` +
      `• You'll be able to accept new requests\n\n` +
      `Use this if you're stuck or need to start fresh.\n\n` +
      `Continue?`
    )

    if (!confirmed) return

    setIsForceClosing(true)
    try {
      console.log('[FORCE CLOSE ALL] Calling API for mechanic:', mechanicId)

      const response = await fetch('/api/mechanic/force-end-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to force close sessions')
      }

      console.log('[FORCE CLOSE ALL] Success:', data)

      // Refresh all data
      await Promise.all([
        fetchActiveSessions(),
        fetchNewRequests({ silent: true }),
        loadSessions({ silent: true })
      ])

      alert(
        `✓ Success!\n\n` +
        `${data.results.sessionsCancelled} session(s) cancelled\n` +
        `${data.results.requestsCancelled} request(s) cancelled\n\n` +
        `You can now accept new requests.`
      )
    } catch (error: any) {
      console.error('[FORCE CLOSE ALL] Error:', error)
      alert(`❌ Failed to close sessions: ${error.message}\n\nPlease refresh the page or contact support.`)
    } finally {
      setIsForceClosing(false)
    }
  }

  const handleClearStuckRequests = async () => {
    try {
      console.log('[CLEAR STUCK REQUESTS] Calling API for mechanic:', mechanicId)

      const response = await fetch('/api/mechanic/clear-stuck-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear stuck requests')
      }

      console.log('[CLEAR STUCK REQUESTS] Success:', data)

      // Hide error banner
      setShowStuckRequestError(false)
      setRequestsError(null)

      // Refresh all data
      await Promise.all([
        fetchActiveSessions(),
        fetchNewRequests({ silent: true }),
        loadSessions({ silent: true })
      ])

      alert(`✓ Cleared ${data.cleared} stuck request(s)!\n\nYou can now accept new requests.`)
    } catch (error: any) {
      console.error('[CLEAR STUCK REQUESTS] Error:', error)
      alert(`❌ Failed to clear stuck requests: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, {mechanic.name}</h1>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-sm text-slate-400">Mechanic Dashboard</p>
                {/* Connection Status */}
                <div className="flex items-center gap-1.5">
                  {realtimeConnected ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-xs text-green-400">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs text-amber-400">Offline</span>
                    </>
                  )}
                </div>
                {/* Last Refresh */}
                <span className="text-xs text-slate-500">
                  Updated {formatTimeAgo(lastRefreshTime)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Force Close All Sessions Button - ALWAYS VISIBLE */}
              <button
                onClick={handleForceCloseAll}
                disabled={isForceClosing}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  activeSessions.length > 0
                    ? 'border-red-500/50 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                    : 'border-slate-600/50 bg-slate-800/30 text-slate-400 hover:bg-slate-700/30'
                }`}
                title={activeSessions.length > 0 ? `Force close ${activeSessions.length} active session(s)` : 'No active sessions to close'}
              >
                <XCircle className={`h-4 w-4 ${isForceClosing ? 'animate-spin' : ''}`} />
                {isForceClosing ? 'Closing...' : 'Force Close All'}
                {activeSessions.length > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {activeSessions.length}
                  </span>
                )}
              </button>
              {/* Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
                title="Refresh dashboard"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/50 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* EMERGENCY: Stuck Request Error Banner */}
        {showStuckRequestError && (
          <div className="mb-6 rounded-3xl border-2 border-red-500/50 bg-gradient-to-r from-red-900/50 to-orange-900/50 p-6 backdrop-blur-sm animate-pulse">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-100">🚨 Stuck Request Detected</h3>
                <p className="mt-2 text-sm text-red-200/90">
                  You have an orphaned accepted request blocking you from accepting new work.
                  This happens when a session ends but the request wasn&apos;t properly cleaned up.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleClearStuckRequests}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear Stuck Requests (Fix Now)
                  </button>
                  <button
                    onClick={() => setShowStuckRequestError(false)}
                    className="text-sm text-red-200/70 underline hover:text-red-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Panel Toggle Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              setShowDebugPanel(!showDebugPanel)
              if (!showDebugPanel && !debugData) {
                void fetchDebugData()
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
          >
            <AlertCircle className="h-4 w-4" />
            {showDebugPanel ? 'Hide Debug Panel' : 'Show Debug Panel (Requests Not Showing?)'}
          </button>
        </div>

        {/* Debug Panel */}
        {showDebugPanel && (
          <div className="mb-6 rounded-3xl border border-red-500/30 bg-red-900/20 p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-red-100">Request Debugging Panel</h3>
                <p className="mt-1 text-sm text-red-200/80">
                  This panel shows you exactly what&apos;s happening with requests in the database
                </p>
              </div>
              <button
                onClick={() => void fetchDebugData()}
                disabled={isLoadingDebug}
                className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {isLoadingDebug ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                Refresh Data
              </button>
            </div>

            {isLoadingDebug && !debugData && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-red-400" />
              </div>
            )}

            {debugData && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-2xl border border-red-400/20 bg-red-900/30 p-4">
                  <h4 className="font-bold text-red-100 mb-3">Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-red-300/60">Total Requests</p>
                      <p className="text-2xl font-bold text-red-100">{debugData.summary?.totalRequests ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-300/60">Should Show (Pending)</p>
                      <p className="text-2xl font-bold text-green-400">{debugData.summary?.pendingRequests ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-300/60">Your Accepted</p>
                      <p className="text-2xl font-bold text-blue-400">{debugData.summary?.acceptedByThisMechanic ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-300/60">Bad State</p>
                      <p className={`text-2xl font-bold ${(debugData.summary?.badStateRequests ?? 0) > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {debugData.summary?.badStateRequests ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-2xl border border-red-400/20 bg-red-900/30 p-4">
                  <h4 className="font-bold text-red-100 mb-3">Breakdown by Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-red-900/20 p-3">
                      <p className="text-xs text-red-300/60">Pending</p>
                      <p className="text-xl font-bold text-green-300">{debugData.breakdown?.byStatus?.pending ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-900/20 p-3">
                      <p className="text-xs text-red-300/60">Accepted</p>
                      <p className="text-xl font-bold text-blue-300">{debugData.breakdown?.byStatus?.accepted ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-900/20 p-3">
                      <p className="text-xs text-red-300/60">Cancelled</p>
                      <p className="text-xl font-bold text-amber-300">{debugData.breakdown?.byStatus?.cancelled ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-red-900/20 p-3">
                      <p className="text-xs text-red-300/60">Other</p>
                      <p className="text-xl font-bold text-purple-300">{debugData.breakdown?.byStatus?.other ?? 0}</p>
                    </div>
                  </div>
                </div>

                {/* Issues Found */}
                {(debugData.issues?.badStateRequests?.length > 0 ||
                  debugData.issues?.oldPendingRequests?.length > 0) && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-900/20 p-4">
                    <h4 className="font-bold text-amber-100 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Issues Found
                    </h4>
                    <div className="space-y-3 text-sm">
                      {debugData.issues.badStateRequests?.length > 0 && (
                        <div className="rounded-lg bg-amber-900/20 p-3">
                          <p className="font-semibold text-amber-200">Bad State Requests ({debugData.issues.badStateRequests.length})</p>
                          <p className="text-xs text-amber-300/80 mt-1">These requests are marked as pending but have a mechanic assigned</p>
                          <div className="mt-2 space-y-1">
                            {debugData.issues.badStateRequests.slice(0, 3).map((issue: any) => (
                              <p key={issue.id} className="text-xs text-amber-300/60">
                                Request {issue.id.substring(0, 8)}... - mechanic_id: {issue.mechanic_id?.substring(0, 8)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {debugData.issues.oldPendingRequests?.length > 0 && (
                        <div className="rounded-lg bg-amber-900/20 p-3">
                          <p className="font-semibold text-amber-200">Old Pending Requests ({debugData.issues.oldPendingRequests.length})</p>
                          <p className="text-xs text-amber-300/80 mt-1">These requests have been pending for more than 24 hours</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Current State Display */}
                <div className="rounded-2xl border border-red-400/20 bg-red-900/30 p-4">
                  <h4 className="font-bold text-red-100 mb-3">What You Should See</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-red-200">
                      ✓ Incoming Requests count: <span className="font-mono font-bold text-green-400">{debugData.summary?.pendingRequests ?? 0}</span>
                    </p>
                    <p className="text-red-200">
                      ✓ Accepted Requests count: <span className="font-mono font-bold text-blue-400">{debugData.summary?.acceptedByThisMechanic ?? 0}</span>
                    </p>
                    <p className="text-red-200/60 text-xs mt-2">
                      If the counts above don&apos;t match what you see below, try refreshing the page or check console logs
                    </p>
                  </div>
                </div>

                {/* Raw Console Data */}
                <details className="rounded-2xl border border-red-400/20 bg-red-900/30 p-4">
                  <summary className="cursor-pointer font-bold text-red-100">View Raw Data (for developers)</summary>
                  <pre className="mt-3 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-300">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {debugData?.error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-900/40 p-4 text-sm text-red-200">
                Error loading debug data: {debugData.error}
              </div>
            )}
          </div>
        )}

        {/* Stripe Connect Banner */}
        {!mechanic.payoutsEnabled && (
          <div className="mb-6 rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-900/20 to-orange-900/20 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-100">Connect Your Bank to Receive Payouts</h3>
                <p className="mt-1 text-sm text-amber-200/80">
                  You earn 70% per session. Complete Stripe onboarding to receive automatic payouts 3-7 days after each session.
                </p>
                <Link
                  href="/mechanic/onboarding/stripe"
                  className="mt-3 inline-flex items-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Connect Stripe Account
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Request Accepted Success Banner */}
        {acceptedSessionId && acceptedCustomerName && (
          <div className="mb-6 rounded-3xl border border-green-400/30 bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-100">Request Accepted Successfully!</h3>
                <p className="mt-1 text-sm text-green-200/80">
                  You&apos;ve accepted the session request from <span className="font-semibold">{acceptedCustomerName}</span>. The session is now in your active sessions below.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/chat/${acceptedSessionId}`}
                    className="inline-flex items-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Join Session Now
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAcceptedSessionId(null)
                      setAcceptedCustomerName(null)
                    }}
                    className="inline-flex items-center rounded-full border border-green-400/30 bg-green-500/10 px-5 py-2.5 text-sm font-semibold text-green-200 transition hover:bg-green-500/20"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Requests</p>
                <p className="mt-1 text-xs text-slate-500">Available for all mechanics</p>
                <p className="mt-2 text-3xl font-bold text-white">{stats.newRequests}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <Radio className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">My Active Work</p>
                <p className="mt-1 text-xs text-slate-500">Waiting + In Progress</p>
                <p className="mt-2 text-3xl font-bold text-white">{stats.activeSessions}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Upcoming</p>
                <p className="mt-2 text-3xl font-bold text-white">{stats.upcomingSessions}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarClock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Earnings</p>
                <p className="mt-2 text-3xl font-bold text-green-400">{formatCurrencyFromCents(stats.totalEarnings)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Active Sessions - Accepted but not started (TOP PRIORITY - MUST BE HIGHLY VISIBLE) */}
            {activeSessions.length > 0 && (
              <section className="space-y-4">
                {/* ⚡ BIG UNMISSABLE ALERT BANNER ⚡ */}
                <div className="rounded-2xl border-4 border-green-500 bg-gradient-to-r from-green-600/30 via-emerald-600/30 to-teal-600/30 p-6 shadow-2xl shadow-green-500/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg animate-pulse">
                        <Radio className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">
                          ⚡ MY ACTIVE WORK: {activeSessions.length}
                        </h3>
                        <p className="mt-1 text-base font-semibold text-green-100">
                          Sessions assigned to you (persists across logout/login)
                        </p>
                      </div>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-xl ring-4 ring-green-400/50">
                      <span className="text-4xl font-black text-white">{activeSessions.length}</span>
                    </div>
                  </div>
                </div>

                {/* Active Sessions List */}
                <div className="rounded-3xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6 shadow-2xl backdrop-blur">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                        <span className="absolute -right-1 -top-1 flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Your Committed Work</h2>
                        <p className="text-sm text-green-300">
                          Must complete or cancel to accept new requests
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        {activeSessions.length} Assigned
                      </span>
                      <span className="text-xs text-green-300/70">
                        {activeSessions.filter(s => s.isLive).length} Live • {activeSessions.filter(s => !s.isLive).length} Waiting
                      </span>
                    </div>
                  </div>

                <div className="space-y-4">
                  {activeSessions.slice(0, 1).map((item) => (
                    <article
                      key={item.id}
                      className="group relative overflow-hidden rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-5 shadow-lg backdrop-blur transition hover:border-green-400/50"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-semibold text-white">{item.customerName}</p>
                              {item.isLive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                  🔴 Live Now
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ⏳ Waiting to Start
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-green-200">{describePlan(item.planCode, item.sessionType)}</p>
                            <p className="text-xs text-green-300/70">Accepted {formatRequestAge(item.acceptedAt ?? item.createdAt)}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase text-green-400">{item.sessionType}</span>
                              {item.intake && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
                                  <FileText className="h-3 w-3" />
                                  Intake
                                </span>
                              )}
                              {item.files && item.files.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300">
                                  <FileText className="h-3 w-3" />
                                  {item.files.length} file{item.files.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.isLive ? (
                            <>
                              {/* Live session buttons */}
                              <button
                                type="button"
                                onClick={() => {
                                  const sessionPath = item.sessionType === 'chat' ? 'chat' : item.sessionType === 'video' ? 'video' : 'diagnostic'
                                  window.location.href = `/${sessionPath}/${item.sessionId}`
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Join Session
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to end this session?')) return
                                  try {
                                    const response = await fetch(`/api/sessions/${item.sessionId}/end`, {
                                      method: 'POST',
                                    })
                                    if (response.ok) {
                                      // Reload sessions to update UI
                                      void loadSessions({ silent: true })
                                    } else {
                                      alert('Failed to end session. Please try again.')
                                    }
                                  } catch (error) {
                                    console.error('Error ending session:', error)
                                    alert('An error occurred. Please try again.')
                                  }
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                              >
                                End Session
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Accepted request buttons */}
                              <button
                                type="button"
                                onClick={() => {
                                  const sessionPath = item.sessionType === 'chat' ? 'chat' : item.sessionType === 'video' ? 'video' : 'diagnostic'
                                  if (item.sessionId) {
                                    window.location.href = `/${sessionPath}/${item.sessionId}`
                                  }
                                }}
                                disabled={!item.sessionId}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Start Session
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelRequest(item.id)}
                                disabled={cancellingRequestId === item.id}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                              >
                                {cancellingRequestId === item.id ? 'Undoing...' : 'Cancel / Unlock'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Show notification if there are more sessions */}
                {activeSessions.length > 1 && (
                  <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
                    <p className="text-sm text-green-200">
                      +{activeSessions.length - 1} more session{activeSessions.length - 1 > 1 ? 's' : ''} waiting. Complete this one first.
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                  <p className="text-xs text-green-200">
                    <strong>💡 How It Works:</strong> Sessions assigned to you remain here even after logout/login.
                    Click &quot;Start Session&quot; to begin work, or &quot;Cancel / Unlock&quot; to release back to all mechanics.
                    You must complete or cancel before accepting new requests.
                  </p>
                </div>
                </div>
              </section>
            )}

            {/* Pending Requests - Available to ALL mechanics */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Pending Requests</h2>
                  <p className="mt-1 text-sm text-slate-400">Available for ANY mechanic to claim</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                  <Radio className="h-3.5 w-3.5" />
                  {newRequests.length} unclaimed
                </span>
              </div>

              {/* BUSINESS RULE: Block accepting when mechanic has active work (ONE AT A TIME) */}
              {activeSessions.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-200">🔒 You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''} assigned to you</p>
                        <p className="mt-1 text-sm text-amber-300/80">
                          Complete or cancel your current work before accepting new requests.
                          Your active sessions persist even if you logout/login - they&apos;re your responsibility.
                        </p>
                        <p className="mt-2 text-xs text-amber-200/70">
                          ↑ Scroll up to &quot;MY ACTIVE WORK&quot; section or use &quot;Force End All&quot; if stuck
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`⚠️ WARNING: This will FORCE-END ${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''}.\n\nOnly use this if your session is stuck and won't end normally.\n\nCustomers will be notified. Continue?`)) return

                        try {
                          const endPromises = activeSessions.map(async (session) => {
                            if (session.sessionId) {
                              const response = await fetch(`/api/sessions/${session.sessionId}/end`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ force: true })
                              })
                              if (!response.ok) {
                                console.error(`Failed to end session ${session.sessionId}`)
                              }
                              return response
                            }
                            return null
                          })

                          await Promise.all(endPromises)

                          // Reload dashboard
                          void loadSessions({ silent: true })
                          void fetchActiveSessions()
                          void fetchNewRequests({ silent: true })

                          alert('✓ All sessions have been force-ended. You can now accept new requests.')
                        } catch (error) {
                          console.error('Error force-ending sessions:', error)
                          alert('❌ Failed to end some sessions. Please refresh the page or contact support.')
                        }
                      }}
                      className="flex-shrink-0 rounded-lg border border-red-400/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 whitespace-nowrap"
                    >
                      Force End All
                    </button>
                  </div>
                </div>
              )}

              {requestsError && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {requestsError}
                </p>
              )}

              {isLoadingRequests && newRequests.length === 0 ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {newRequests.slice(0, visibleNewRequests).map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{item.customerName}</p>
                            <p className="text-sm text-slate-400">{describePlan(item.planCode, item.sessionType)}</p>
                            <p className="text-xs text-slate-500">Requested {formatRequestAge(item.createdAt)}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase text-slate-500">{item.sessionType}</span>
                              {item.intake && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                                  <FileText className="h-3 w-3" />
                                  Intake
                                </span>
                              )}
                              {item.files && item.files.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                                  <FileText className="h-3 w-3" />
                                  {item.files.length} file{item.files.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => acceptRequest(item.id)}
                            disabled={acceptingRequestId === item.id || activeSessions.length > 0}
                            className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {acceptingRequestId === item.id ? 'Accepting...' : 'Accept Request'}
                          </button>
                        </div>
                      </article>
                    ))}
                    {newRequests.length === 0 && !isLoadingRequests && (
                      <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                        No pending requests at the moment.
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {newRequests.length > visibleNewRequests && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleNewRequests(prev => prev + ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-6 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20"
                      >
                        View More ({newRequests.length - visibleNewRequests} remaining)
                      </button>
                    </div>
                  )}
                  {visibleNewRequests > ITEMS_PER_PAGE && newRequests.length > 0 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleNewRequests(ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-700"
                      >
                        Show Less
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Upcoming Sessions */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Upcoming Sessions</h2>
                  <p className="mt-1 text-sm text-slate-400">Future scheduled sessions</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {upcomingSessions.length}
                </span>
              </div>

              {sessionsError && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {sessionsError}
                </p>
              )}

              {isLoadingSessions && upcomingSessions.length === 0 ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {upcomingSessions.slice(0, visibleUpcomingSessions).map((session) => (
                      <article
                        key={session.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-white">{session.customerName}</p>
                          <p className="text-sm text-slate-400">
                            {describePlan(session.plan, session.sessionType)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(session.scheduledStart)}
                          </p>
                        </div>
                        <Link
                          href={session.sessionType === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          View Session
                        </Link>
                      </article>
                    ))}
                    {upcomingSessions.length === 0 && !isLoadingSessions && (
                      <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                        No upcoming sessions scheduled.
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {upcomingSessions.length > visibleUpcomingSessions && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleUpcomingSessions(prev => prev + ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
                      >
                        View More ({upcomingSessions.length - visibleUpcomingSessions} remaining)
                      </button>
                    </div>
                  )}
                  {visibleUpcomingSessions > ITEMS_PER_PAGE && upcomingSessions.length > 0 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleUpcomingSessions(ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-700"
                      >
                        Show Less
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Session History - View Only */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Session History</h2>
                  <p className="mt-1 text-sm text-slate-400">Completed and cancelled sessions</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                  <History className="h-3.5 w-3.5" />
                  {sessionHistory.length}
                </span>
              </div>

              {isLoadingSessions && sessionHistory.length === 0 ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {sessionHistory.slice(0, visibleHistoryItems).map((session) => (
                      <article
                        key={session.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{session.customerName}</p>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                session.status === 'completed'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}>
                                {session.status === 'completed' ? 'Completed' : 'Cancelled'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">
                              {describePlan(session.plan, session.sessionType)}
                              {session.durationMinutes && ` • ${session.durationMinutes} min`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(session.endedAt ?? session.scheduledEnd)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => alert('Session history detail view temporarily disabled')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                          {session.status === 'completed' && session.plan && (
                            <span className="text-xs text-green-400 font-semibold">
                              Earned: {formatCurrencyFromCents(calculateEarningsCents(session.plan))}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Empty State - Moved outside to prevent hydration errors */}
                  {sessionHistory.length === 0 && !isLoadingSessions && (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                      No session history yet.
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {sessionHistory.length > visibleHistoryItems && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleHistoryItems(prev => prev + ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-2.5 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                      >
                        View More ({sessionHistory.length - visibleHistoryItems} remaining)
                      </button>
                    </div>
                  )}
                  {visibleHistoryItems > ITEMS_PER_PAGE && sessionHistory.length > 0 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleHistoryItems(ITEMS_PER_PAGE)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-700"
                      >
                        Show Less
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Earnings Summary */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Recent Earnings</h2>
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <p className="mt-1 text-sm text-slate-400">70% of each session</p>

              <div className="mt-4 space-y-3">
                {earningsSummary.rows.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/30 p-3">
                    <div>
                      <p className="text-sm font-medium text-white">{describePlan(row.plan, row.sessionType)}</p>
                      <p className="text-xs text-slate-500">{formatDate(row.date)}</p>
                    </div>
                    <p className="font-semibold text-green-400">{formatCurrencyFromCents(row.earningsCents)}</p>
                  </div>
                ))}
                {earningsSummary.rows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-700/30 bg-slate-900/20 p-6 text-center text-sm text-slate-500">
                    No earnings yet
                  </div>
                )}
              </div>

              {earningsSummary.totalCents > 0 && (
                <div className="mt-4 rounded-xl border border-green-500/20 bg-green-900/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Earned</span>
                    <span className="text-xl font-bold text-green-400">{formatCurrencyFromCents(earningsSummary.totalCents)}</span>
                  </div>
                  {mechanic.payoutsEnabled && (
                    <p className="mt-2 text-xs text-slate-500">Payouts transfer automatically 3-7 days after sessions</p>
                  )}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-orange-900/20 to-red-900/20 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-orange-100">Quick Links</h2>
              <p className="mt-1 text-sm text-orange-200/60">Common actions and tools</p>

              <div className="mt-4 space-y-2">
                {!mechanic.payoutsEnabled && (
                  <Link
                    href="/mechanic/onboarding/stripe"
                    className="block rounded-xl border border-amber-500/20 bg-amber-900/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-900/20"
                  >
                    Setup Stripe Payouts
                  </Link>
                )}
                <Link
                  href="/mechanic/logout"
                  className="block rounded-xl border border-slate-700/30 bg-slate-900/30 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900/50"
                >
                  Sign Out
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Request Detail Modal */}
      <EnhancedRequestDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={acceptRequest}
        onStartSession={startSession}
        accepting={acceptingRequestId === selectedRequest?.id}
        accepted={selectedRequest?.sessionId != null}
      />

      {/* Session History Detail Modal - Temporarily disabled */}
      {/* {selectedHistorySession && (
        <SessionHistoryModal
          sessionId={selectedHistorySession.id}
          sessionType={selectedHistorySession.sessionType}
          customerName={selectedHistorySession.customerName}
          plan={selectedHistorySession.plan}
          status={selectedHistorySession.status}
          startedAt={selectedHistorySession.startedAt}
          endedAt={selectedHistorySession.endedAt}
          durationMinutes={selectedHistorySession.durationMinutes}
          onClose={() => setSelectedHistorySession(null)}
        />
      )} */}
    </div>
  )
}

function normalizeSessionStatus(value: string | null): SessionStatus {
  if (value && (SESSION_STATUS_VALUES as string[]).includes(value)) {
    return value as SessionStatus
  }
  if (value === 'pending') return 'waiting'
  if (value === 'in_progress') return 'live'
  return 'scheduled'
}

function describePlan(planCode: string | null | undefined, sessionType: string) {
  switch (planCode) {
    case 'chat10':
      return 'Quick Chat (30 min)'
    case 'video15':
      return 'Standard Video (45 min)'
    case 'diagnostic':
      return 'Full Diagnostic (60 min)'
    default:
      return sessionType === 'chat'
        ? 'Chat consultation'
        : sessionType === 'video'
          ? 'Video session'
          : 'Diagnostic session'
  }
}

function formatRequestAge(iso: string) {
  const created = new Date(iso).getTime()
  const diffMs = Date.now() - created

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 'just now'
  }

  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function extractSessionRequestRow(payload: unknown): SessionRequestRow | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const payloadRecord = payload as Record<string, unknown>
  const source =
    payloadRecord.request && typeof payloadRecord.request === 'object'
      ? (payloadRecord.request as Record<string, unknown>)
      : payloadRecord

  if (!source || typeof source !== 'object') {
    return null
  }

  const candidate = source as Record<string, unknown>

  if (
    typeof candidate.id === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.session_type === 'string' &&
    typeof candidate.plan_code === 'string' &&
    typeof candidate.created_at === 'string' &&
    typeof candidate.customer_id === 'string'
  ) {
    return candidate as SessionRequestRow
  }

  return null
}

function diffInMinutes(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return null

  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  return Math.max(1, Math.round((end - start) / 60000))
}

function toTimeValue(iso: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY
  const value = new Date(iso).getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function calculateEarningsCents(plan: string | null) {
  const planKey = asPlanKey(plan)
  if (!planKey) return null
  const base = PLAN_PRICING[planKey]
  if (typeof base !== 'number') return null
  return Math.round(base * MECHANIC_SHARE)
}

function asPlanKey(value: string | null | undefined): PlanKey | null {
  if (!value) return null
  return PLAN_KEYS.includes(value as PlanKey) ? (value as PlanKey) : null
}

function formatCurrencyFromCents(cents: number | null) {
  if (cents == null) return '$0.00'
  return currencyFormatter.format(cents / 100)
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'To be scheduled'
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return 'To be scheduled'
  return value.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return '—'
  return value.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimeAgo(date: Date) {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
