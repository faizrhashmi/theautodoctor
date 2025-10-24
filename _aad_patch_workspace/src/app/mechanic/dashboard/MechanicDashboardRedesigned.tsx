'use client'
// AAD patch placeholder: we'll extend tabs & overview in next step

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  LogOut,
  PlayCircle,
  RefreshCw,
  XCircle,
  Eye,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { SessionStatus } from '@/types/session'

const MECHANIC_SHARE = 0.7

type MechanicDashboardClientProps = {
  mechanic: {
    id: string
    name: string
    email: string
    stripeConnected: boolean
    payoutsEnabled: boolean
  }
}

type SessionRequest = {
  id: string
  customer_name: string | null
  customer_email: string | null
  description: string
  session_type: string
  plan_code: string
  status: string
  created_at: string
}

type Session = {
  id: string
  customer_user_id: string
  status: SessionStatus
  plan: string | null
  type: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  metadata: any
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const PLAN_PRICING: Record<string, number> = {
  chat10: 999,
  video15: 2999,
  diagnostic: 4999,
}

export default function MechanicDashboardRedesigned({ mechanic }: MechanicDashboardClientProps) {
  const supabase = useMemo(() => createClient(), [])

  // State
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'history'>('requests')
  const [pendingRequests, setPendingRequests] = useState<SessionRequest[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [completedSessions, setCompletedSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  // Calculate stats
  const stats = useMemo(() => {
    const todayEarnings = completedSessions
      .filter(s => {
        if (!s.ended_at) return false
        const endDate = new Date(s.ended_at)
        const today = new Date()
        return endDate.toDateString() === today.toDateString()
      })
      .reduce((sum, s) => {
        const price = PLAN_PRICING[s.plan || 'chat10'] || 0
        return sum + (price * MECHANIC_SHARE / 100)
      }, 0)

    const totalEarnings = completedSessions.reduce((sum, s) => {
      const price = PLAN_PRICING[s.plan || 'chat10'] || 0
      return sum + (price * MECHANIC_SHARE / 100)
    }, 0)

    return {
      pendingRequests: pendingRequests.length,
      activeSessions: activeSessions.length,
      todayEarnings,
      totalEarnings,
      completedToday: completedSessions.filter(s => {
        if (!s.ended_at) return false
        const endDate = new Date(s.ended_at)
        const today = new Date()
        return endDate.toDateString() === today.toDateString()
      }).length,
    }
  }, [pendingRequests, activeSessions, completedSessions])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setError(null)

      // Fetch pending requests
      const { data: requests, error: reqError } = await supabase
        .from('session_requests')
        .select('*')
        .in('status', ['pending', 'unattended'])
        .is('mechanic_id', null)
        .order('created_at', { ascending: true })

      if (reqError) throw reqError

      // Fetch active sessions (waiting, live, reconnecting)
      const { data: active, error: activeError } = await supabase
        .from('sessions')
        .select('*')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['waiting', 'live', 'reconnecting'])
        .order('created_at', { ascending: false })

      if (activeError) throw activeError

      // Fetch completed sessions (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: completed, error: completedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['completed', 'cancelled'])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('ended_at', { ascending: false })
        .limit(50)

      if (completedError) throw completedError

      setPendingRequests(requests || [])
      setActiveSessions(active || [])
      setCompletedSessions(completed || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, mechanic.id])

  useEffect(() => {
    fetchData()

    // Set up realtime subscriptions
    const requestsChannel = supabase
      .channel('mechanic_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_requests' },
        () => fetchData()
      )
      .subscribe()

    const sessionsChannel = supabase
      .channel('mechanic_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `mechanic_id=eq.${mechanic.id}` },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(sessionsChannel)
    }
  }, [fetchData, supabase, mechanic.id])

  // Accept request
  const handleAccept = async (requestId: string) => {
    setAcceptingId(requestId)
    try {
      const response = await fetch(`/api/mechanics/requests/${requestId}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept')
      }

      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to accept request')
    } finally {
      setAcceptingId(null)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await fetch('/api/mechanic/logout', { method: 'POST' })
    window.location.href = '/mechanic/login'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Mechanic Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">{mechanic.name} • {mechanic.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Ribbon */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {/* Pending Requests */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.pendingRequests}</p>
                  <p className="text-xs text-amber-300">Pending</p>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.activeSessions}</p>
                  <p className="text-xs text-green-300">Active</p>
                </div>
              </div>
            </div>

            {/* Today's Earnings */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{currencyFormatter.format(stats.todayEarnings / 100)}</p>
                  <p className="text-xs text-blue-300">Today</p>
                </div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{currencyFormatter.format(stats.totalEarnings / 100)}</p>
                  <p className="text-xs text-purple-300">Total (30d)</p>
                </div>
              </div>
            </div>

            {/* Completed Today */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.completedToday}</p>
                  <p className="text-xs text-slate-400">Done Today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'requests'
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'border-b-2 border-green-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Sessions ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-slate-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History ({completedSessions.length})
          </button>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-12 text-center">
                <Clock className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-slate-400">No pending requests</p>
                <p className="mt-2 text-sm text-slate-500">New requests will appear here</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-6 transition-all hover:border-blue-500/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {request.customer_name || 'Customer'}
                        </h3>
                        <StatusBadge status="waiting" size="sm" />
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                          {request.session_type}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-300">{request.description || 'No description provided'}</p>
                      <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.created_at)} at {formatTime(request.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {currencyFormatter.format((PLAN_PRICING[request.plan_code] || 0) * MECHANIC_SHARE / 100)} (your share)
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={acceptingId === request.id}
                      className="ml-4 flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {acceptingId === request.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )

        }

        {/* Active Sessions Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeSessions.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-slate-400">No active sessions</p>
                <p className="mt-2 text-sm text-slate-500">Accepted sessions will appear here</p>
              </div>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border border-green-500/30 bg-slate-800 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          Active Session
                        </h3>
                        <StatusBadge status={session.status} size="md" />
                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
                          {session.type}
                        </span>
                      </div>
                      {session.started_at && (
                        <p className="mt-2 text-sm text-slate-400">
                          Started: {formatDate(session.started_at)} at {formatTime(session.started_at)}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/${session.type}/${session.id}`}
                      className="ml-4 flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {session.status === 'live' ? 'Join Session' : 'Start Session'}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {completedSessions.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-slate-400">No session history</p>
                <p className="mt-2 text-sm text-slate-500">Completed sessions will appear here</p>
              </div>
            ) : (
              completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={session.status} size="sm" />
                        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                          {session.type}
                        </span>
                        {session.duration_minutes && (
                          <span className="text-sm text-slate-400">
                            {session.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {session.ended_at
                          ? `Ended: ${formatDate(session.ended_at)} at ${formatTime(session.ended_at)}`
                          : 'No end time recorded'}
                      </p>
                    </div>
                    {session.status === 'completed' && (
                      <div className="ml-4 text-right">
                        <p className="text-lg font-semibold text-green-400">
                          {currencyFormatter.format((PLAN_PRICING[session.plan || 'chat10'] || 0) * MECHANIC_SHARE / 100)}
                        </p>
                        <p className="text-xs text-slate-500">Earned</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
