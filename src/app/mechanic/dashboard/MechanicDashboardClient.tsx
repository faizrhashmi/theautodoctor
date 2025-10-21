'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  Clock,
  DollarSign,
  Loader2,
  Radio,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { MechanicPresencePayload } from '@/types/presence'
import type { SessionRequest } from '@/types/session'
import type { SessionStatus } from '@/types/session'
import type { MechanicAvailabilityBlock } from '@/types/session'
import { PRICING, type PlanKey } from '@/config/pricing'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MECHANIC_SHARE = 0.7
const PLAN_KEYS: PlanKey[] = ['chat10', 'video15', 'diagnostic']

const SESSION_STATUS_VALUES: SessionStatus[] = ['scheduled', 'waiting', 'live', 'completed', 'cancelled']

type SessionRequestRow = Database['public']['Tables']['session_requests']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type AvailabilityRow = Database['public']['Tables']['mechanic_availability']['Row']
type AvailabilitySelectRow = Pick<
  AvailabilityRow,
  'id' | 'day_of_week' | 'start_time' | 'end_time' | 'is_available'
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
  initialMechanic: {
    id: string
    name: string
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export default function MechanicDashboardClient({ initialMechanic }: MechanicDashboardClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const mechanicId = initialMechanic.id
  const [mechanicName, setMechanicName] = useState(initialMechanic.name)
  const [isOnline, setIsOnline] = useState(false)
  const [channelReady, setChannelReady] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [presenceError, setPresenceError] = useState<string | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<SessionRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)
  const [availabilityBlocks, setAvailabilityBlocks] = useState<MechanicAvailabilityBlock[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<MechanicDashboardSession[]>([])
  const [completedSessions, setCompletedSessions] = useState<MechanicDashboardSession[]>([])
  const [activeSession, setActiveSession] = useState<MechanicDashboardSession | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const requestsChannelRef = useRef<RealtimeChannel | null>(null)
  const sessionsChannelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setMechanicName(initialMechanic.name)
  }, [initialMechanic.name])

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

  const mapAvailabilityRow = useCallback((row: AvailabilitySelectRow): MechanicAvailabilityBlock => ({
    id: row.id,
    weekday: typeof row.day_of_week === 'number' ? row.day_of_week : 0,
    startTime: row.start_time ?? '00:00',
    endTime: row.end_time ?? '00:00',
    isActive: typeof row.is_available === 'boolean' ? row.is_available : true,
  }), [])

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

  useEffect(() => {
    const channel = supabase.channel('online_mechanics', {
      config: { presence: { key: mechanicId } },
    })

    channelRef.current = channel
    setChannelReady(false)
    setPresenceError(null)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setChannelReady(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setPresenceError('Unable to connect to realtime presence. Please refresh and try again.')
        setChannelReady(false)
        setIsOnline(false)
      }
    })

    return () => {
      void channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
      setChannelReady(false)
      setIsOnline(false)
    }
  }, [mechanicId, supabase])

  useEffect(() => {
    if (!mechanicId) {
      setIncomingRequests([])
      setAvailabilityBlocks([])
      setUpcomingSessions([])
      setCompletedSessions([])
      setActiveSession(null)
      return
    }

    let cancelled = false
    setIsLoadingRequests(true)
    setRequestsError(null)

    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('session_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (cancelled || !isMountedRef.current) return

        if (error) {
          console.error('Failed to load session requests', error)
          setRequestsError('Unable to load incoming requests right now.')
          setIncomingRequests([])
        } else if (data) {
          setIncomingRequests(
            data
              .map(mapRowToRequest)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          )
        }
      } catch (err) {
        if (cancelled || !isMountedRef.current) return
        console.error('Failed to load session requests', err)
        setRequestsError('Unable to load incoming requests right now.')
        setIncomingRequests([])
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoadingRequests(false)
        }
      }
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
      cancelled = true
      void channel.unsubscribe()
      supabase.removeChannel(channel)
      requestsChannelRef.current = null
    }
  }, [mechanicId, supabase, mapRowToRequest, removeRequest, upsertRequest])

  const loadAvailability = useCallback(async () => {
    if (!mechanicId) return
    setIsLoadingAvailability(true)
    setAvailabilityError(null)

    try {
      const { data, error } = await supabase
        .from('mechanic_availability')
        .select('id, day_of_week, start_time, end_time, is_available')
        .eq('mechanic_id', mechanicId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (!isMountedRef.current) return

      if (error) {
        console.error('Failed to load availability', error)
        setAvailabilityError('Unable to load your availability schedule right now.')
        setAvailabilityBlocks([])
      } else if (data) {
        setAvailabilityBlocks(
          data.map(mapAvailabilityRow).sort((a, b) => {
            if (a.weekday === b.weekday) {
              return a.startTime.localeCompare(b.startTime)
            }
            return a.weekday - b.weekday
          })
        )
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Failed to load availability', err)
      setAvailabilityError('Unable to load your availability schedule right now.')
      setAvailabilityBlocks([])
    } finally {
      if (isMountedRef.current) {
        setIsLoadingAvailability(false)
      }
    }
  }, [mechanicId, mapAvailabilityRow, supabase])

  useEffect(() => {
    void loadAvailability()
  }, [loadAvailability])

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

  useEffect(() => {
    if (!isOnline) return

    const handleBeforeUnload = () => {
      void channelRef.current?.untrack()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isOnline])

  const toggleOnlineStatus = async () => {
    if (!mechanicId) {
      setPresenceError('Log in to manage your availability.')
      return
    }

    const channel = channelRef.current

    if (!channel || !channelReady) {
      setPresenceError('Connecting to realtime presence… please try again in a moment.')
      return
    }

    setIsToggling(true)
    setPresenceError(null)

    try {
      if (isOnline) {
        const { error } = await channel.untrack()
        if (error) throw error
        setIsOnline(false)
      } else {
        const payload: MechanicPresencePayload = {
          user_id: mechanicId,
          status: 'online',
          name: mechanicName,
        }
        const { error } = await channel.track(payload)
        if (error) throw error
        setIsOnline(true)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while updating your availability.'
      setPresenceError(message)
    } finally {
      setIsToggling(false)
    }
  }

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

      if (payload && typeof payload === 'object' && 'request' in payload) {
        const acceptedId = (payload as { request?: { id?: string } }).request?.id
        if (acceptedId) {
          removeRequest(acceptedId)
        }
      }
    } catch (error) {
      console.error('Accept request failed', error)
      setRequestsError(error instanceof Error ? error.message : 'Unable to accept this request right now.')
    } finally {
      setAcceptingRequestId(null)
    }
  }

  const earningsSummary = useMemo(() => {
    const rows = completedSessions.slice(0, 5).map((session) => ({
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-600">Mechanic Workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard overview</h1>
          <p className="text-sm text-slate-500">Manage your availability, pick up live requests, and review your earnings.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div
            className={`flex flex-col items-stretch gap-2 rounded-3xl border px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center ${
              isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline
                    ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-300'
                }`}
              />
              <span className="font-semibold">
                {isOnline ? 'You are visible to customers' : 'You are currently offline'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleOnlineStatus}
              disabled={isToggling || !channelReady}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                isOnline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-orange-600 text-white hover:bg-orange-700 disabled:bg-orange-400'
              }`}
            >
              {isToggling ? 'Updating…' : isOnline ? 'Go offline' : channelReady ? 'Go online' : 'Connecting…'}
            </button>
          </div>
          {presenceError && <p className="text-xs text-rose-600">{presenceError}</p>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Incoming requests</h2>
                <p className="text-sm text-slate-500">Claim customers who are waiting in real time.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Radio className="h-3.5 w-3.5" />
                {incomingRequests.length} waiting
              </span>
            </div>
            {requestsError && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {requestsError}
              </p>
            )}
            {isLoadingRequests && incomingRequests.length === 0 ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {incomingRequests.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                      <p className="text-sm text-slate-500">{describePlan(item.planCode, item.sessionType)}</p>
                      <p className="text-xs text-slate-500">Requested {formatRequestAge(item.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase text-slate-500">{item.sessionType}</span>
                      <button
                        type="button"
                        onClick={() => acceptRequest(item.id)}
                        disabled={acceptingRequestId === item.id}
                        className="inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:bg-orange-400"
                      >
                        {acceptingRequestId === item.id ? 'Accepting…' : 'Accept request'}
                      </button>
                    </div>
                  </article>
                ))}
                {incomingRequests.length === 0 && !isLoadingRequests && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No live requests at the moment. Stay online to be the first to know.
                  </div>
                )}
              </div>
            )}
          </section>

          {activeSession && (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">Active session</h2>
                  <p className="text-sm text-emerald-700">
                    Currently in session with {activeSession.customerName}.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Users className="h-3.5 w-3.5" /> Live
                </span>
              </div>
              <dl className="mt-4 grid gap-4 text-sm text-emerald-800 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formatDateTime(activeSession.startedAt ?? activeSession.scheduledStart)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span>
                    {activeSession.durationMinutes
                      ? `${activeSession.durationMinutes} min elapsed`
                      : 'Tracking time…'}
                  </span>
                </div>
              </dl>
              <Link
                href={`/mechanic/session/${activeSession.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Rejoin workspace
              </Link>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
                <p className="text-sm text-slate-500">Prep for scheduled and waiting appointments.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                {upcomingSessions.length}
              </span>
            </div>
            {sessionsError && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {sessionsError}
              </p>
            )}
            {isLoadingSessions && upcomingSessions.length === 0 ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {upcomingSessions.map((session) => (
                  <article
                    key={session.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {describePlan(session.plan, session.sessionType as SessionRequest['sessionType'])} • {session.status}
                      </p>
                      <p className="text-xs text-slate-500">
                        Starts {formatDateTime(session.scheduledStart)}
                      </p>
                    </div>
                    <Link
                      href={`/mechanic/session/${session.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
                    >
                      Open details
                    </Link>
                  </article>
                ))}
                {upcomingSessions.length === 0 && !isLoadingSessions && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No upcoming sessions assigned. Accepted sessions will appear here automatically.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Earnings history</h2>
                <p className="text-sm text-slate-500">
                  Mechanics earn 70% of session revenue. Review your recent payouts below.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrencyFromCents(earningsSummary.totalCents)}
              </span>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-right">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {earningsSummary.rows.length > 0 ? (
                    earningsSummary.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {describePlan(row.plan, row.sessionType as SessionRequest['sessionType'])}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.durationMinutes ? `${row.durationMinutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatCurrencyFromCents(row.earningsCents)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                        No completed sessions yet. Your first earnings will appear after you wrap a session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Weekly availability</h2>
              <Link href="/mechanic/availability" className="text-sm font-semibold text-orange-600">
                Manage
              </Link>
            </div>
            <p className="mt-1 text-sm text-slate-500">Update the blocks below to control when customers can book you.</p>
            {availabilityError && (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {availabilityError}
              </p>
            )}
            {isLoadingAvailability ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
              </div>
            ) : availabilityBlocks.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {availabilityBlocks.map((block) => (
                  <li
                    key={block.id}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                      block.isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{WEEKDAYS[block.weekday]}</p>
                      <p className="text-xs text-slate-500">
                        {formatAvailabilityTime(block.startTime)} – {formatAvailabilityTime(block.endTime)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase">
                      {block.isActive ? 'Open' : 'Paused'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                You have not set any availability yet. Create blocks to let customers schedule time with you.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-600 to-red-600 p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold">Digital waivers ready</h2>
            <p className="mt-1 text-sm text-blue-100">
              Customers sign automatically before joining so you can focus on diagnostics.
            </p>
            <Link
              href="/waiver"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Review waiver template
            </Link>
          </section>
        </aside>
      </div>
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

function describePlan(planCode: string | null | undefined, sessionType: SessionRequest['sessionType']) {
  switch (planCode) {
    case 'chat10':
      return 'Quick Chat (30 min chat)'
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
  const base = PRICING[planKey]?.priceCents
  if (typeof base !== 'number') return null
  return Math.round(base * MECHANIC_SHARE)
}

function asPlanKey(value: string | null | undefined): PlanKey | null {
  if (!value) return null
  return PLAN_KEYS.includes(value as PlanKey) ? (value as PlanKey) : null
}

function formatCurrencyFromCents(cents: number | null) {
  if (cents == null) return '—'
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

function formatAvailabilityTime(time: string) {
  if (!time) return '—'
  const [hourString, minuteString] = time.split(':')
  const hour = Number.parseInt(hourString ?? '0', 10)
  const minute = Number.parseInt(minuteString ?? '0', 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time
  const date = new Date(Date.UTC(1970, 0, 1, hour, minute))
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
