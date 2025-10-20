'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CalendarDays,
  ClipboardSignature,
  MessageCircle,
  PlayCircle,
  Search,
  TimerReset
} from 'lucide-react'
import SessionSummaryCard from '@/components/session/SessionSummaryCard'
import type {
  MechanicAvailabilityBlock,
  SessionQueueItem,
  SessionRequest,
  SessionSummary,
} from '@/types/session'
import { createClient } from '@/lib/supabase'
import type { MechanicPresencePayload } from '@/types/presence'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const MOCK_QUEUE: SessionQueueItem[] = [
  {
    id: 'queue-1',
    vehicle: '2020 Audi Q5',
    customerName: 'Brandon Lee',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    status: 'waiting',
    concernSummary: 'Check engine light + rough idle',
    waiverAccepted: true,
    extensionBalance: 0,
    queuePosition: 1,
    waitingSince: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'queue-2',
    vehicle: '2015 Honda Civic',
    customerName: 'Maya Patel',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    status: 'scheduled',
    concernSummary: 'Pre-purchase inspection',
    waiverAccepted: false,
    extensionBalance: 15,
    queuePosition: 2
  }
]

const MOCK_AVAILABILITY: MechanicAvailabilityBlock[] = [
  { id: 'a1', weekday: 1, startTime: '09:00', endTime: '13:00', isActive: true },
  { id: 'a2', weekday: 3, startTime: '12:00', endTime: '18:00', isActive: true },
  { id: 'a3', weekday: 5, startTime: '10:00', endTime: '14:00', isActive: false }
]

const MOCK_HISTORY: SessionSummary[] = [
  {
    id: 'history-1',
    vehicle: '2018 BMW 3 Series',
    customerName: 'Alex Johnson',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'completed',
    concernSummary: 'Brake squeal while driving',
    waiverAccepted: true,
    extensionBalance: 0
  }
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type SessionRequestRow = Database['public']['Tables']['session_requests']['Row']

export default function MechanicDashboardPage() {
  const [search, setSearch] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const requestsChannelRef = useRef<RealtimeChannel | null>(null)
  const [mechanicId, setMechanicId] = useState<string | null>(null)
  const [mechanicName, setMechanicName] = useState<string>('Mechanic')
  const [authChecked, setAuthChecked] = useState(false)
  const [channelReady, setChannelReady] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [presenceError, setPresenceError] = useState<string | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<SessionRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)

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

        return next.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })
    },
    [mapRowToRequest]
  )

  const removeRequest = useCallback((id: string) => {
    setIncomingRequests((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const formatRequestAge = useCallback((iso: string) => {
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
  }, [])

  const describePlan = useCallback(
    (planCode: string, sessionType: SessionRequest['sessionType']) => {
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
    },
    []
  )

  useEffect(() => {
    let active = true

    async function loadMechanic() {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser()

        if (!active) return

        if (error) {
          if (error.message === 'Auth session missing') {
            setPresenceError('Log in to broadcast your availability to customers.')
          } else {
            setPresenceError('Unable to verify your mechanic session right now.')
          }
          return
        }

        if (user?.user_metadata?.role === 'mechanic') {
          setMechanicId(user.id)
          setMechanicName(
            user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email ||
              'Mechanic'
          )
          setPresenceError(null)
        } else if (user) {
          setPresenceError('Presence tracking is limited to mechanic accounts.')
        } else {
          setPresenceError('Log in to broadcast your availability to customers.')
        }
      } catch (error) {
        if (!active) return
        setPresenceError('Unable to verify your mechanic session right now.')
      } finally {
        if (active) {
          setAuthChecked(true)
        }
      }
    }

    loadMechanic()

    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (!mechanicId) {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setChannelReady(false)
      setIsOnline(false)
      if (requestsChannelRef.current) {
        void requestsChannelRef.current.unsubscribe()
        supabase.removeChannel(requestsChannelRef.current)
        requestsChannelRef.current = null
      }
      setIncomingRequests([])
      setIsLoadingRequests(false)
      setRequestsError(null)
      return
    }

    const channel = supabase.channel('online_mechanics', {
      config: { presence: { key: mechanicId } }
    })

    channelRef.current = channel
    setPresenceError(null)
    setChannelReady(false)

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
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
      setChannelReady(false)
      setIsOnline(false)
    }
  }, [mechanicId, supabase])

  useEffect(() => {
    let cancelled = false

    if (!mechanicId) {
      return
    }

    if (requestsChannelRef.current) {
      void requestsChannelRef.current.unsubscribe()
      supabase.removeChannel(requestsChannelRef.current)
      requestsChannelRef.current = null
    }

    setIsLoadingRequests(true)
    setRequestsError(null)

    supabase
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          console.error('Failed to load session requests', error)
          setRequestsError('Unable to load incoming requests right now.')
          setIncomingRequests([])
        } else if (data) {
          setIncomingRequests(
            data
              .map(mapRowToRequest)
              .sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
          )
          setRequestsError(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingRequests(false)
        }
      })

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

  useEffect(() => {
    if (!isOnline) return

    const handleBeforeUnload = () => {
      channelRef.current?.untrack()
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
          name: mechanicName
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
        method: 'POST'
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

  const filteredQueue = useMemo(() => {
    return MOCK_QUEUE.filter((item) => item.customerName.toLowerCase().includes(search.toLowerCase()))
  }, [search])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-600">Mechanic Workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Session Queue & Schedule</h1>
          <p className="text-sm text-slate-500">Stay on top of your live calls, upcoming bookings, and availability.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div
            className={`flex flex-col items-stretch gap-2 rounded-3xl border px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]' : 'bg-slate-300'
                }`}
              />
              <span className="font-semibold">
                {isOnline ? 'You are visible to customers' : 'You are currently offline'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleOnlineStatus}
              disabled={isToggling || !channelReady || !mechanicId}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                isOnline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
              }`}
            >
              {isToggling
                ? 'Updating…'
                : isOnline
                ? 'Go offline'
                : mechanicId
                ? channelReady
                  ? 'Go online'
                  : 'Connecting…'
                : 'Log in first'}
            </button>
          </div>
          {!authChecked && (
            <p className="text-xs text-slate-500">Checking your mechanic credentials…</p>
          )}
          {presenceError && (
            <p className="text-xs font-medium text-rose-600">{presenceError}</p>
          )}
          <Link
            href="/mechanic/availability"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            <CalendarDays className="h-4 w-4" />
            Manage availability
          </Link>
          <Link
            href="/mechanic/session/queue-1"
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <PlayCircle className="h-4 w-4" />
            Join next session
          </Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Incoming Requests</h2>
              {isLoadingRequests && (
                <span className="text-xs text-slate-500">Checking for new alerts…</span>
              )}
            </div>
            {requestsError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {requestsError}
              </div>
            )}
            {incomingRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {isLoadingRequests
                  ? 'Looking for active customer requests…'
                  : 'No pending requests at the moment. Stay online to be first in line!'}
              </div>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{request.customerName}</p>
                        <p className="text-xs text-slate-500">
                          {describePlan(request.planCode, request.sessionType)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Requested {formatRequestAge(request.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            request.sessionType === 'chat'
                              ? 'bg-blue-100 text-blue-700'
                              : request.sessionType === 'video'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {request.sessionType === 'chat'
                            ? 'Quick Chat'
                            : request.sessionType === 'video'
                            ? 'Video Call'
                            : 'Diagnostic'}
                        </span>
                        <button
                          type="button"
                          onClick={() => acceptRequest(request.id)}
                          disabled={acceptingRequestId === request.id}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                          {acceptingRequestId === request.id ? 'Accepting…' : 'Accept Request'}
                        </button>
                      </div>
                    </div>
                    {request.customerEmail && (
                      <p className="mt-3 text-xs text-slate-500">
                        Email: <span className="font-medium text-slate-600">{request.customerEmail}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Live queue</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customers"
                  className="w-full rounded-full border border-slate-200 px-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-xs uppercase text-slate-500">{item.vehicle}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.customerName}</p>
                    <p className="text-sm text-slate-500">{item.concernSummary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-blue-500" />
                      <span>{new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                      <span>Waiver {item.waiverAccepted ? 'on file' : 'pending'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TimerReset className="h-4 w-4 text-purple-500" />
                      <span>{item.extensionBalance} min banked</span>
                    </div>
                  </div>
                  <Link
                    href={`/mechanic/session/${item.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Open workspace
                  </Link>
                </div>
              ))}
              {filteredQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No sessions match your search just yet.
                </div>
              )}
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent sessions</h2>
              <Link href="/mechanic/summaries" className="text-sm font-semibold text-blue-600">
                View all
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {MOCK_HISTORY.map((summary) => (
                <SessionSummaryCard key={summary.id} summary={summary} />
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Availability overview</h2>
            <p className="mt-1 text-sm text-slate-500">Adjust your live hours to control when bookings appear.</p>
            <ul className="mt-4 space-y-3">
              {MOCK_AVAILABILITY.map((block) => (
                <li
                  key={block.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                    block.isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{WEEKDAYS[block.weekday]}</p>
                    <p className="text-xs text-slate-500">
                      {block.startTime} - {block.endTime}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase">
                    {block.isActive ? 'Open' : 'Paused'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-500 p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold">Digital waivers ready</h2>
            <p className="mt-1 text-sm text-blue-100">
              Customers sign automatically before joining so you can focus on diagnostics.
            </p>
            <Link
              href="/waiver"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <ClipboardSignature className="h-4 w-4" /> Review waiver template
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
