'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, CheckCircle2, Clock, DollarSign, LogOut, PlayCircle, RefreshCw,
  Calendar, TrendingUp, Activity, Home, Inbox, Video, History, FolderOpen,
  User, CalendarClock, Wallet, HelpCircle, Star, Download, Edit, MessageSquare,
  FileText, ChevronRight, Search, Filter, X, Check, Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { SessionStatus } from '@/types/session'

const MECHANIC_SHARE = 0.7

type MechanicDashboardProps = {
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
  description: string | null
  session_type: string
  plan_code: string
  status: string
  created_at: string
}

type Session = {
  id: string
  customer_user_id: string | null
  status: SessionStatus
  plan: string | null
  type: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  metadata: any
}

type NavSection = 'overview' | 'requests' | 'active' | 'history' | 'files' | 'profile' | 'availability' | 'earnings' | 'support'

const PLAN_PRICING: Record<string, number> = {
  chat10: 999,
  video15: 2999,
  diagnostic: 4999,
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export default function MechanicDashboardComplete({ mechanic }: MechanicDashboardProps) {
  const supabase = useMemo(() => createClient(), [])

  // Navigation state
  const [activeSection, setActiveSection] = useState<NavSection>('overview')

  // Data state
  const [pendingRequests, setPendingRequests] = useState<SessionRequest[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [completedSessions, setCompletedSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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

    const completedToday = completedSessions.filter(s => {
      if (!s.ended_at) return false
      const endDate = new Date(s.ended_at)
      const today = new Date()
      return endDate.toDateString() === today.toDateString()
    }).length

    return {
      pendingRequests: pendingRequests.length,
      activeSessions: activeSessions.length,
      todayEarnings,
      totalEarnings,
      completedToday,
      totalCompleted: completedSessions.length,
    }
  }, [pendingRequests, activeSessions, completedSessions])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch pending requests
      const { data: requests, error: reqError } = await supabase
        .from('session_requests')
        .select('*')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })

      if (reqError) throw reqError

      // Fetch active sessions
      const { data: active, error: activeError } = await supabase
        .from('sessions')
        .select('*')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['waiting', 'live'])
        .order('created_at', { ascending: false })

      if (activeError) throw activeError

      // Fetch completed sessions (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: completed, error: completedError } = await supabase
        .from('sessions')
        .select('*')
        .eq('mechanic_id', mechanic.id)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('ended_at', { ascending: false })

      if (completedError) throw completedError

      setPendingRequests(requests || [])
      setActiveSessions(active || [])
      setCompletedSessions(completed || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [mechanic.id, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Accept request
  const handleAccept = async (requestId: string) => {
    setAcceptingId(requestId)
    try {
      const response = await fetch(`/api/mechanics/requests/${requestId}/accept`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to accept request')
      await fetchData()
      setSelectedRequest(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAcceptingId(null)
    }
  }

  // Navigation items
  const navItems = [
    { id: 'overview' as NavSection, label: 'Overview', icon: Home, badge: null },
    { id: 'requests' as NavSection, label: 'Requests Queue', icon: Inbox, badge: stats.pendingRequests },
    { id: 'active' as NavSection, label: 'Active Sessions', icon: Video, badge: stats.activeSessions },
    { id: 'history' as NavSection, label: 'History', icon: History, badge: null },
    { id: 'files' as NavSection, label: 'Files', icon: FolderOpen, badge: null },
    { id: 'profile' as NavSection, label: 'Profile & Ratings', icon: User, badge: null },
    { id: 'availability' as NavSection, label: 'Availability', icon: CalendarClock, badge: null },
    { id: 'earnings' as NavSection, label: 'Earnings & Payouts', icon: Wallet, badge: null },
    { id: 'support' as NavSection, label: 'Support', icon: HelpCircle, badge: null },
  ]

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <h1 className="text-lg font-bold text-white">Mechanic Portal</h1>
          <button
            onClick={() => window.location.href = '/mechanic/login'}
            className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-sm font-medium text-slate-400">Logged in as</p>
            <p className="mt-1 text-sm font-semibold text-white">{mechanic.name}</p>
            <p className="text-xs text-slate-500">{mechanic.email}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </span>
                  {item.badge !== null && item.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {navItems.find(n => n.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-slate-400">
                {activeSection === 'overview' && 'Welcome back! Here\'s your dashboard overview'}
                {activeSection === 'requests' && `${stats.pendingRequests} pending requests`}
                {activeSection === 'active' && `${stats.activeSessions} active sessions`}
                {activeSection === 'history' && `${stats.totalCompleted} completed sessions`}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-300">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && activeSection !== 'overview' && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {/* Content Sections */}
          {!isLoading && (
            <>
              {/* 1. OVERVIEW */}
              {activeSection === 'overview' && (
                <OverviewSection
                  stats={stats}
                  pendingRequests={pendingRequests}
                  activeSessions={activeSessions}
                  mechanic={mechanic}
                  onNavigate={setActiveSection}
                />
              )}

              {/* 2. REQUESTS QUEUE */}
              {activeSection === 'requests' && (
                <RequestsQueueSection
                  requests={pendingRequests}
                  selectedRequest={selectedRequest}
                  onSelectRequest={setSelectedRequest}
                  onAccept={handleAccept}
                  acceptingId={acceptingId}
                />
              )}

              {/* 3. ACTIVE SESSIONS */}
              {activeSection === 'active' && (
                <ActiveSessionsSection sessions={activeSessions} />
              )}

              {/* 4. HISTORY */}
              {activeSection === 'history' && (
                <HistorySection sessions={completedSessions} />
              )}

              {/* 5. FILES */}
              {activeSection === 'files' && (
                <FilesSection mechanicId={mechanic.id} />
              )}

              {/* 6. PROFILE & RATINGS */}
              {activeSection === 'profile' && (
                <ProfileSection mechanic={mechanic} />
              )}

              {/* 7. AVAILABILITY */}
              {activeSection === 'availability' && (
                <AvailabilitySection mechanicId={mechanic.id} />
              )}

              {/* 8. EARNINGS & PAYOUTS */}
              {activeSection === 'earnings' && (
                <EarningsSection
                  sessions={completedSessions}
                  mechanicId={mechanic.id}
                  stats={stats}
                />
              )}

              {/* 9. SUPPORT */}
              {activeSection === 'support' && (
                <SupportSection />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

// 1. OVERVIEW SECTION
function OverviewSection({ stats, pendingRequests, activeSessions, mechanic, onNavigate }: any) {
  const quickActions = [
    { label: 'View Requests', count: stats.pendingRequests, onClick: () => onNavigate('requests'), color: 'blue' },
    { label: 'Active Sessions', count: stats.activeSessions, onClick: () => onNavigate('active'), color: 'green' },
    { label: 'View Earnings', amount: currencyFormatter.format(stats.todayEarnings / 100), onClick: () => onNavigate('earnings'), color: 'purple' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<Inbox />} label="Pending Requests" value={stats.pendingRequests} color="amber" />
        <StatCard icon={<Activity />} label="Active Sessions" value={stats.activeSessions} color="green" />
        <StatCard icon={<DollarSign />} label="Today's Earnings" value={currencyFormatter.format(stats.todayEarnings / 100)} color="blue" />
        <StatCard icon={<TrendingUp />} label="Total (30d)" value={currencyFormatter.format(stats.totalEarnings / 100)} color="purple" />
        <StatCard icon={<CheckCircle2 />} label="Completed Today" value={stats.completedToday} color="slate" />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex flex-col rounded-lg border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-slate-600"
            >
              <span className="text-2xl font-bold text-white">{action.count || action.amount}</span>
              <span className="text-sm text-slate-400">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Requests Preview */}
      {pendingRequests.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Requests</h3>
            <button
              onClick={() => onNavigate('requests')}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="rounded border border-slate-700 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{req.customer_name || 'Customer'}</span>
                  <StatusBadge status={req.status as any} size="sm" />
                </div>
                <p className="mt-1 text-sm text-slate-400">{req.description || 'No description'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripe Connection Warning */}
      {!mechanic.stripeConnected && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300">Stripe Not Connected</p>
              <p className="mt-1 text-sm text-amber-200">
                Connect your Stripe account to receive payouts for completed sessions.
              </p>
              <Link
                href="/mechanic/onboarding/stripe"
                className="mt-3 inline-block rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Connect Stripe
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 2. REQUESTS QUEUE SECTION
function RequestsQueueSection({ requests, selectedRequest, onSelectRequest, onAccept, acceptingId }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Requests List */}
      <div className="space-y-3 lg:col-span-2">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-12">
            <Inbox className="h-16 w-16 text-slate-600" />
            <p className="mt-4 text-slate-400">No pending requests</p>
          </div>
        ) : (
          requests.map((req: SessionRequest) => (
            <div
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className={`cursor-pointer rounded-lg border p-4 transition ${
                selectedRequest?.id === req.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{req.customer_name || 'Customer'}</h4>
                    <StatusBadge status={req.status as any} size="sm" />
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                      {req.session_type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{req.description || 'No description provided'}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span><Calendar className="inline h-3 w-3" /> {new Date(req.created_at).toLocaleString()}</span>
                    <span><DollarSign className="inline h-3 w-3" /> {currencyFormatter.format((PLAN_PRICING[req.plan_code] || 0) * MECHANIC_SHARE / 100)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Detail Modal */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 lg:col-span-1">
        {selectedRequest ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Request Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Customer</label>
                <p className="font-medium text-white">{selectedRequest.customer_name || 'Anonymous'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Email</label>
                <p className="font-medium text-white">{selectedRequest.customer_email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Session Type</label>
                <p className="font-medium text-white">{selectedRequest.session_type}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Plan</label>
                <p className="font-medium text-white">{selectedRequest.plan_code}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Description</label>
                <p className="text-sm text-white">{selectedRequest.description || 'No description'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Your Earnings</label>
                <p className="text-lg font-bold text-green-400">
                  {currencyFormatter.format((PLAN_PRICING[selectedRequest.plan_code] || 0) * MECHANIC_SHARE / 100)}
                </p>
              </div>
            </div>
            <button
              onClick={() => onAccept(selectedRequest.id)}
              disabled={acceptingId === selectedRequest.id}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {acceptingId === selectedRequest.id ? (
                <><RefreshCw className="inline h-4 w-4 animate-spin" /> Accepting...</>
              ) : (
                <><Check className="inline h-4 w-4" /> Accept Request</>
              )}
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Info className="h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 3. ACTIVE SESSIONS SECTION
function ActiveSessionsSection({ sessions }: { sessions: Session[] }) {
  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-12">
          <Video className="h-16 w-16 text-slate-600" />
          <p className="mt-4 text-slate-400">No active sessions</p>
        </div>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-white">Session {session.id.slice(0, 8)}</h4>
                  <StatusBadge status={session.status} size="md" />
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                    {session.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'Not started'}</p>
              </div>
              <Link
                href={`/${session.type}/${session.id}`}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                <PlayCircle className="h-5 w-5" />
                Join Session
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// 4. HISTORY SECTION
function HistorySection({ sessions }: { sessions: Session[] }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-400">Session ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-400">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-400">Completed</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-400">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-400">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No completed sessions in the last 30 days
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-white">{session.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{session.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {session.ended_at ? new Date(session.ended_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {session.duration_minutes ? `${session.duration_minutes} min` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-green-400">
                    {currencyFormatter.format((PLAN_PRICING[session.plan || 'chat10'] || 0) * MECHANIC_SHARE / 100)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 5. FILES SECTION
function FilesSection({ mechanicId }: { mechanicId: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
      <FolderOpen className="mx-auto h-16 w-16 text-slate-600" />
      <h3 className="mt-4 text-lg font-semibold text-white">Files Browser</h3>
      <p className="mt-2 text-slate-400">File management coming soon</p>
    </div>
  )
}

// 6. PROFILE & RATINGS SECTION
function ProfileSection({ mechanic }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400">Name</label>
            <p className="font-medium text-white">{mechanic.name}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Email</label>
            <p className="font-medium text-white">{mechanic.email}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Stripe Status</label>
            <p className={mechanic.stripeConnected ? 'text-green-400' : 'text-amber-400'}>
              {mechanic.stripeConnected ? 'Connected' : 'Not Connected'}
            </p>
          </div>
          <button className="mt-4 flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
            <Edit className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Ratings & Reviews</h3>
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
          <span className="text-2xl font-bold text-white">5.0</span>
          <span className="text-slate-400">(No reviews yet)</span>
        </div>
      </div>
    </div>
  )
}

// 7. AVAILABILITY SECTION
function AvailabilitySection({ mechanicId }: { mechanicId: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
      <CalendarClock className="mx-auto h-16 w-16 text-slate-600" />
      <h3 className="mt-4 text-lg font-semibold text-white">Availability Calendar</h3>
      <p className="mt-2 text-slate-400">Availability management coming soon</p>
    </div>
  )
}

// 8. EARNINGS & PAYOUTS SECTION
function EarningsSection({ sessions, mechanicId, stats }: any) {
  const handleExportCSV = () => {
    const csvData = sessions.map((s: Session) => ({
      session_id: s.id,
      type: s.type,
      completed: s.ended_at || '',
      duration: s.duration_minutes || 0,
      earnings: (PLAN_PRICING[s.plan || 'chat10'] || 0) * MECHANIC_SHARE / 100,
    }))

    const csv = [
      ['Session ID', 'Type', 'Completed', 'Duration (min)', 'Earnings ($)'],
      ...csvData.map(d => [d.session_id, d.type, d.completed, d.duration, d.earnings])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <p className="text-sm text-slate-400">Total Earnings (30d)</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {currencyFormatter.format(stats.totalEarnings / 100)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <p className="text-sm text-slate-400">Today's Earnings</p>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {currencyFormatter.format(stats.todayEarnings / 100)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <p className="text-sm text-slate-400">Sessions Completed</p>
          <p className="mt-2 text-3xl font-bold text-blue-400">
            {stats.totalCompleted}
          </p>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Earnings Table */}
      <HistorySection sessions={sessions} />
    </div>
  )
}

// 9. SUPPORT SECTION
function SupportSection() {
  const helpArticles = [
    { title: 'Getting Started Guide', icon: FileText, href: '/knowledge-base/getting-started' },
    { title: 'How to Accept Requests', icon: CheckCircle2, href: '/knowledge-base/accept-requests' },
    { title: 'Session Best Practices', icon: Video, href: '/knowledge-base/best-practices' },
    { title: 'Payment & Payouts', icon: DollarSign, href: '/knowledge-base/payouts' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Need Help?</h3>
        <p className="text-slate-400">Contact support or browse our knowledge base</p>
        <div className="mt-4 flex gap-3">
          <Link href="mailto:support@askautodoctor.com" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Email Support
          </Link>
          <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
            Live Chat
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Knowledge Base</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {helpArticles.map((article, idx) => {
            const Icon = article.icon
            return (
              <Link
                key={idx}
                href={article.href}
                className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600"
              >
                <Icon className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-white">{article.title}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Helper: Stat Card Component
function StatCard({ icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/20 text-amber-300',
    green: 'bg-green-500/20 text-green-300',
    blue: 'bg-blue-500/20 text-blue-300',
    purple: 'bg-purple-500/20 text-purple-300',
    slate: 'bg-slate-500/20 text-slate-300',
  }

  return (
    <div className={`rounded-lg border border-slate-700 ${colors[color]} p-6`}>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-slate-800/50 p-3">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
