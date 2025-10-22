'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CalendarClock,
  Clock,
  DollarSign,
  Loader2,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Eye,
  History,
  FileText,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { SessionRequest } from '@/types/session'
import type { SessionStatus } from '@/types/session'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import RequestDetailModal from '@/components/mechanic/RequestDetailModal'

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

  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)
  const [acceptedSessionId, setAcceptedSessionId] = useState<string | null>(null)
  const [acceptedCustomerName, setAcceptedCustomerName] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)

  const [requestHistory, setRequestHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [upcomingSessions, setUpcomingSessions] = useState<MechanicDashboardSession[]>([])
  const [completedSessions, setCompletedSessions] = useState<MechanicDashboardSession[]>([])
  const [activeSession, setActiveSession] = useState<MechanicDashboardSession | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const requestsChannelRef = useRef<RealtimeChannel | null>(null)
  const sessionsChannelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const mapRowToRequest = useCallback(
    (row: SessionRequestRow): SessionRequest => ({
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
    }),
    []
  )

  const upsertRequest = useCallback(
    (row: SessionRequestRow) => {
      setIncomingRequests((prev) => {
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
    setIncomingRequests((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const fetchRequests = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!mechanicId) return

      if (!options?.silent) {
        setIsLoadingRequests(true)
      }
      setRequestsError(null)

      try {
        const response = await fetch('/api/mechanics/requests', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        const body = (await response
          .json()
          .catch(() => null)) as { requests?: SessionRequestRow[] | null } | null

        if (!response.ok) {
          console.error(
            '[MECHANIC DASHBOARD] Failed to load session requests',
            response.status,
            body ?? {}
          )
          if (!isMountedRef.current) return
          setRequestsError('Unable to load incoming requests right now.')
          setIncomingRequests([])
          return
        }

        if (!isMountedRef.current) return

        const mapped = Array.isArray(body?.requests) ? body.requests.map(mapRowToRequest) : []

        setIncomingRequests(
          mapped.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        )
      } catch (error) {
        console.error('[MECHANIC DASHBOARD] Failed to load session requests', error)
        if (!isMountedRef.current) return
        setRequestsError('Unable to load incoming requests right now.')
        setIncomingRequests([])
      } finally {
        if (!options?.silent && isMountedRef.current) {
          setIsLoadingRequests(false)
        }
      }
    },
    [mechanicId, mapRowToRequest]
  )

  const fetchHistory = useCallback(
    async () => {
      if (!mechanicId) return

      setIsLoadingHistory(true)

      try {
        const response = await fetch('/api/mechanics/requests/history', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        const body = await response.json().catch(() => null)

        if (!response.ok) {
          console.error('[MECHANIC DASHBOARD] Failed to load request history', response.status)
          return
        }

        if (!isMountedRef.current) return

        const history = Array.isArray(body?.history) ? body.history : []
        setRequestHistory(history)
      } catch (error) {
        console.error('[MECHANIC DASHBOARD] Failed to load request history', error)
      } finally {
        if (isMountedRef.current) {
          setIsLoadingHistory(false)
        }
      }
    },
    [mechanicId]
  )

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

  // Load incoming requests
  useEffect(() => {
    if (!mechanicId) {
      setIncomingRequests([])
      setIsLoadingRequests(false)
      return
    }

    void fetchRequests()

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
          void fetchRequests({ silent: true })
        }
      })
      .on('broadcast', { event: 'request_accepted' }, ({ payload }) => {
        const id = typeof payload?.id === 'string' ? payload.id : null
        if (id) removeRequest(id)
      })
      .on('broadcast', { event: 'request_cancelled' }, ({ payload }) => {
        const id = typeof payload?.id === 'string' ? payload.id : null
        if (id) removeRequest(id)
      })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setRequestsError('Realtime updates unavailable. Refresh to see new requests.')
      }
    })

    requestsChannelRef.current = channel

    return () => {
      void channel.unsubscribe()
      supabase.removeChannel(channel)
      requestsChannelRef.current = null
    }
  }, [fetchRequests, mechanicId, removeRequest, supabase, upsertRequest])

  const loadSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!mechanicId) return

      if (!options?.silent) {
        setIsLoadingSessions(true)
      }
      setSessionsError(null)

      const { data, error } = await supabase
        .from('sessions')
        .select('id, status, plan, type, scheduled_start, scheduled_end, scheduled_for, started_at, ended_at, duration_minutes, metadata')
        .eq('mechanic_id', mechanicId)
        .order('scheduled_start', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (!isMountedRef.current) {
        return
      }

      if (error) {
        console.error('Failed to load mechanic sessions', error)
        setSessionsError('Unable to load your sessions right now.')
        setUpcomingSessions([])
        setCompletedSessions([])
        setActiveSession(null)
      } else if (data) {
        const mapped = data.map(mapSessionRow)
        const active = mapped.find((session) => session.status === 'live') ?? null
        const upcoming = mapped
          .filter((session) => session.status === 'scheduled' || session.status === 'waiting')
          .sort((a, b) => {
            const aTime = toTimeValue(a.scheduledStart)
            const bTime = toTimeValue(b.scheduledStart)
            return aTime - bTime
          })
        const completed = mapped
          .filter((session) => session.status === 'completed')
          .sort((a, b) => toTimeValue(b.endedAt ?? b.scheduledEnd) - toTimeValue(a.endedAt ?? a.scheduledEnd))

        setActiveSession(active)
        setUpcomingSessions(upcoming)
        setCompletedSessions(completed)
      }

      if (!options?.silent && isMountedRef.current) {
        setIsLoadingSessions(false)
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

  // Load request history
  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

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

      // Get request info and session type
      let sessionType: 'chat' | 'video' | 'diagnostic' = 'chat' // default
      if (payload && typeof payload === 'object' && 'request' in payload) {
        const request = (payload as { request?: { id?: string; sessionType?: string } }).request
        if (request?.id) {
          removeRequest(request.id)
        }
        // Get session type from request
        if (request?.sessionType) {
          sessionType = request.sessionType as 'chat' | 'video' | 'diagnostic'
        }
      }

      // Redirect to the correct session page based on type
      if (payload && typeof payload === 'object' && 'session' in payload) {
        const session = (payload as { session?: { id?: string } }).session
        if (session?.id) {
          // Map session type to URL path
          const sessionPath = sessionType === 'chat' ? 'chat' : sessionType === 'video' ? 'video' : 'diagnostic'
          console.log(`[accept-request] Redirecting to ${sessionType} session:`, session.id)
          // Use window.location.href for full page navigation
          window.location.href = `/${sessionPath}/${session.id}`
          return
        }
      }

      // Fallback: Reload sessions to show newly accepted session
      void loadSessions({ silent: true })
    } catch (error) {
      console.error('Accept request failed', error)
      setRequestsError(error instanceof Error ? error.message : 'Unable to accept this request right now.')
    } finally {
      setAcceptingRequestId(null)
    }
  }

  const earningsSummary = useMemo(() => {
    const rows = completedSessions.slice(0, 10).map((session) => ({
      id: session.id,
      date: session.endedAt ?? session.scheduledEnd ?? session.startedAt ?? session.scheduledStart,
      plan: session.plan,
      sessionType: session.sessionType,
      durationMinutes: session.durationMinutes,
      earningsCents: calculateEarningsCents(session.plan),
    }))

    const totalCents = completedSessions.reduce((sum, session) => {
      const value = calculateEarningsCents(session.plan)
      return value ? sum + value : sum
    }, 0)

    return { rows, totalCents }
  }, [completedSessions])

  const stats = useMemo(() => {
    return {
      pendingRequests: incomingRequests.length,
      upcomingSessions: upcomingSessions.length,
      completedSessions: completedSessions.length,
      totalEarnings: earningsSummary.totalCents,
    }
  }, [incomingRequests.length, upcomingSessions.length, completedSessions.length, earningsSummary.totalCents])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back, {mechanic.name}</h1>
              <p className="mt-1 text-sm text-slate-400">Mechanic Dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/50 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

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
                <p className="mt-2 text-3xl font-bold text-white">{stats.pendingRequests}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <Radio className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Upcoming Sessions</p>
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
                <p className="text-sm text-slate-400">Completed</p>
                <p className="mt-2 text-3xl font-bold text-white">{stats.completedSessions}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
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
            {/* Active Session */}
            {activeSession && (
              <section className="rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-green-100">Active Session</h2>
                    <p className="mt-1 text-sm text-green-200/80">
                      Currently in session with {activeSession.customerName}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-6 text-sm text-green-200/80">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{describePlan(activeSession.plan, activeSession.sessionType)}</span>
                    </div>
                  </div>
                  <Link
                    href={`/chat/${activeSession.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Rejoin Session
                  </Link>
                </div>
              </section>
            )}

            {/* Incoming Requests */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Incoming Requests</h2>
                  <p className="mt-1 text-sm text-slate-400">New customers waiting for help</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                  <Radio className="h-3.5 w-3.5" />
                  {incomingRequests.length} waiting
                </span>
              </div>

              {requestsError && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {requestsError}
                </p>
              )}

              {isLoadingRequests && incomingRequests.length === 0 ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {incomingRequests.map((item) => (
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
                          disabled={acceptingRequestId === item.id}
                          className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:bg-orange-400"
                        >
                          {acceptingRequestId === item.id ? 'Accepting...' : 'Accept Request'}
                        </button>
                      </div>
                    </article>
                  ))}
                  {incomingRequests.length === 0 && !isLoadingRequests && (
                    <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                      No pending requests at the moment.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Upcoming Sessions */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Upcoming Sessions</h2>
                  <p className="mt-1 text-sm text-slate-400">Scheduled and waiting sessions</p>
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
                <div className="mt-6 space-y-3">
                  {upcomingSessions.map((session) => (
                    <article
                      key={session.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white">{session.customerName}</p>
                        <p className="text-sm text-slate-400">
                          {describePlan(session.plan, session.sessionType)} • {session.status}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(session.scheduledStart)}
                        </p>
                      </div>
                      <Link
                        href={`/chat/${session.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                    </article>
                  ))}
                  {upcomingSessions.length === 0 && !isLoadingSessions && (
                    <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                      No upcoming sessions. Accepted requests will appear here.
                    </div>
                  )}
                </div>
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

            {/* Request History */}
            <section className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                  <History className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Request History</h2>
                  <p className="text-xs text-slate-400">Past accepted requests</p>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : requestHistory.length > 0 ? (
                <div className="space-y-2">
                  {requestHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-700/30 bg-slate-900/30 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{item.customer_name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.created_at).toLocaleDateString()} • {item.status}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold uppercase ${
                          item.status === 'accepted' ? 'text-green-400' : 'text-slate-500'
                        }`}>
                          {item.session_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700/30 bg-slate-900/20 p-6 text-center text-sm text-slate-500">
                  No history yet
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Request Detail Modal */}
      <RequestDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={acceptRequest}
        accepting={acceptingRequestId === selectedRequest?.id}
      />
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
