'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  History, TrendingUp, Clock, CheckCircle, XCircle,
  Filter, Calendar, Download, RefreshCw, Eye, DollarSign,
  Video, MessageSquare, Wrench, BarChart3
} from 'lucide-react'

type SessionStatus = 'scheduled' | 'waiting' | 'live' | 'completed' | 'cancelled'
type SessionType = 'chat' | 'video' | 'diagnostic'

type Session = {
  id: string
  customer_name: string
  plan: string | null
  type: SessionType
  status: SessionStatus
  scheduled_start: string | null
  scheduled_end: string | null
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  metadata: any
}

type SessionStats = {
  total_sessions: number
  completed_sessions: number
  cancelled_sessions: number
  total_duration_minutes: number
  total_earnings_cents: number
  avg_session_duration: number
}

const PLAN_PRICING: Record<string, number> = {
  chat10: 999,
  video15: 2999,
  diagnostic: 4999,
}

const MECHANIC_SHARE = 0.7

export default function MechanicSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [page, statusFilter, typeFilter, fromDate, toDate])

  async function fetchSessions() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      params.append('limit', String(limit))
      params.append('offset', String(page * limit))

      const response = await fetch(`/api/mechanic/sessions/history?${params.toString()}`)

      if (response.status === 401) {
        router.push('/mechanic/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
      setStats(data.stats || null)
      setHasMore(data.sessions?.length === limit)
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('Failed to load sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: SessionStatus) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        )
      case 'live':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            Live
          </span>
        )
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <Clock className="h-3 w-3" />
            Waiting
          </span>
        )
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
            <Calendar className="h-3 w-3" />
            Scheduled
          </span>
        )
    }
  }

  function getTypeIcon(type: SessionType) {
    switch (type) {
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-blue-400" />
      case 'video':
        return <Video className="h-4 w-4 text-purple-400" />
      case 'diagnostic':
        return <Wrench className="h-4 w-4 text-orange-400" />
    }
  }

  function calculateEarnings(plan: string | null) {
    if (!plan) return 0
    const baseCents = PLAN_PRICING[plan] || 0
    return Math.round(baseCents * MECHANIC_SHARE)
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  function formatDuration(minutes: number | null) {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  function exportToCSV() {
    const headers = ['Date', 'Customer', 'Type', 'Plan', 'Status', 'Duration', 'Earnings']
    const csvContent = [
      headers.join(','),
      ...sessions.map(s => [
        s.ended_at || s.started_at || s.scheduled_start || '',
        s.customer_name,
        s.type,
        s.plan || 'N/A',
        s.status,
        s.duration_minutes || 0,
        formatCurrency(calculateEarnings(s.plan)),
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const filteredSessions = sessions.filter(session => {
    if (searchQuery && !session.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading && page === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 overflow-x-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 overflow-x-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Session History & Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">View detailed session history and performance metrics</p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={sessions.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Analytics Cards */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Sessions</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.total_sessions}</p>
                </div>
                <History className="h-10 w-10 text-blue-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-green-700/50 bg-green-900/20 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">Completed</p>
                  <p className="mt-2 text-3xl font-bold text-green-400">{stats.completed_sessions}</p>
                  <p className="mt-1 text-xs text-green-300/60">
                    {stats.total_sessions > 0 ? Math.round((stats.completed_sessions / stats.total_sessions) * 100) : 0}% success rate
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-purple-700/50 bg-purple-900/20 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Avg Duration</p>
                  <p className="mt-2 text-3xl font-bold text-purple-400">{formatDuration(stats.avg_session_duration)}</p>
                  <p className="mt-1 text-xs text-purple-300/60">
                    Total: {formatDuration(stats.total_duration_minutes)}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-purple-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-green-700/50 bg-green-900/20 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">Total Earned</p>
                  <p className="mt-2 text-3xl font-bold text-green-400">{formatCurrency(stats.total_earnings_cents)}</p>
                  <p className="mt-1 text-xs text-green-300/60">From completed sessions</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-white">Filters</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="live">Live</option>
                <option value="waiting">Waiting</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="chat">Chat</option>
                <option value="video">Video</option>
                <option value="diagnostic">Diagnostic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(0)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Search Customer</label>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-white">Sessions</h2>
            <button
              onClick={() => {
                setPage(0)
                fetchSessions()
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-900/20 p-4 text-center text-red-300">
              {error}
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
              <History className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">No sessions found</p>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(session.type)}
                          <h3 className="font-semibold text-white">{session.customer_name}</h3>
                          {getStatusBadge(session.status)}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {session.ended_at
                              ? new Date(session.ended_at).toLocaleString()
                              : session.started_at
                              ? new Date(session.started_at).toLocaleString()
                              : session.scheduled_start
                              ? new Date(session.scheduled_start).toLocaleString()
                              : 'N/A'}
                          </span>
                          {session.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(session.duration_minutes)}
                            </span>
                          )}
                          {session.status === 'completed' && session.plan && (
                            <span className="flex items-center gap-1 text-green-400">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(calculateEarnings(session.plan))}
                            </span>
                          )}
                        </div>

                        <div className="mt-2">
                          <span className="text-xs text-slate-500">
                            Plan: {session.plan || 'N/A'} • Type: {session.type}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/mechanic/session/${session.id}`)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 sm:w-auto"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">Page {page + 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/mechanic/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-300 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
