// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Video,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Activity
} from 'lucide-react'

type PlatformStats = {
  users: {
    total: number
    customers: number
    mechanics: number
    change: number
  }
  sessions: {
    total: number
    live: number
    completed: number
    change: number
  }
  revenue: {
    total: number
    today: number
    change: number
  }
  workshops: {
    active: number
    pending: number
    withMechanics: number
    change: number
  }
}

type BetaProgramData = {
  status: string
  readinessScore: number
  workshops: {
    active: number
    withMechanics: number
    ready: number
    target: number
  }
  topWorkshops: Array<{
    id: string
    name: string
    mechanics: number
    healthScore: number
  }>
  blockers: string[]
  nextSteps: string[]
}

export default function AnalyticsOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [betaData, setBetaData] = useState<BetaProgramData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      // Fetch platform stats
      const [usersRes, sessionsRes, betaRes] = await Promise.all([
        fetch('/api/admin/users/customers'),
        fetch('/api/admin/sessions/stats'),
        fetch('/api/admin/analytics/beta-program')
      ])

      const [usersData, sessionsData, betaResponse] = await Promise.all([
        usersRes.json(),
        sessionsRes.json(),
        betaRes.json()
      ])

      // Calculate stats (mock change percentages for now)
      setStats({
        users: {
          total: (usersData.total || 0),
          customers: usersData.total || 0,
          mechanics: 0, // Will be fetched separately
          change: Math.floor(Math.random() * 20) - 5 // Mock change
        },
        sessions: {
          total: (sessionsData.live || 0) + (sessionsData.waiting || 0) + (sessionsData.completed || 0),
          live: sessionsData.live || 0,
          completed: sessionsData.completed || 0,
          change: Math.floor(Math.random() * 30) - 10
        },
        revenue: {
          total: sessionsData.revenue || 0,
          today: sessionsData.revenue || 0,
          change: Math.floor(Math.random() * 25) - 5
        },
        workshops: {
          active: betaResponse.data?.workshops?.active || 0,
          pending: 0,
          withMechanics: betaResponse.data?.workshops?.withMechanics || 0,
          change: Math.floor(Math.random() * 15) - 3
        }
      })

      if (betaResponse.success && betaResponse.data) {
        setBetaData(betaResponse.data)
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Platform-wide metrics and performance insights
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              period === 'today'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              period === 'week'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              period === 'month'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats?.users.total || 0}
          change={stats?.users.change || 0}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Active Sessions"
          value={stats?.sessions.live || 0}
          change={stats?.sessions.change || 0}
          icon={<Video className="h-5 w-5" />}
          color="green"
          subtitle={`${stats?.sessions.completed || 0} completed`}
        />
        <MetricCard
          title="Revenue"
          value={`$${(stats?.revenue.total || 0).toLocaleString()}`}
          change={stats?.revenue.change || 0}
          icon={<DollarSign className="h-5 w-5" />}
          color="purple"
          subtitle={period === 'today' ? 'Today' : period === 'week' ? 'This week' : 'This month'}
        />
        <MetricCard
          title="Active Workshops"
          value={stats?.workshops.active || 0}
          change={stats?.workshops.change || 0}
          icon={<Building2 className="h-5 w-5" />}
          color="orange"
          subtitle={`${stats?.workshops.withMechanics || 0} with mechanics`}
        />
      </div>

      {/* Beta Program Status */}
      {betaData && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Workshop Beta Program</h2>
              <p className="text-sm text-slate-400">Track beta program readiness and progress</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600">
                {betaData.readinessScore}%
              </div>
              <div className="text-xs text-slate-400">Readiness Score</div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
              betaData.status === 'ready'
                ? 'bg-green-100 text-green-800'
                : betaData.status === 'in_progress'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {betaData.status === 'ready' && <CheckCircle className="h-4 w-4" />}
              {betaData.status === 'in_progress' && <Clock className="h-4 w-4" />}
              {betaData.status === 'not_started' && <AlertCircle className="h-4 w-4" />}
              {betaData.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              <div className="text-sm font-medium text-slate-400">Active Workshops</div>
              <div className="text-2xl font-bold text-white">
                {betaData.workshops.active}
                <span className="text-sm text-slate-400">/{betaData.workshops.target}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              <div className="text-sm font-medium text-slate-400">With Mechanics</div>
              <div className="text-2xl font-bold text-white">{betaData.workshops.withMechanics}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              <div className="text-sm font-medium text-slate-400">Beta Ready</div>
              <div className="text-2xl font-bold text-white">{betaData.workshops.ready}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              <div className="text-sm font-medium text-slate-400">Readiness</div>
              <div className="text-2xl font-bold text-orange-600">{betaData.readinessScore}%</div>
            </div>
          </div>

          {/* Blockers & Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blockers */}
            {betaData.blockers.length > 0 && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Blockers ({betaData.blockers.length})
                </h3>
                <ul className="space-y-1">
                  {betaData.blockers.slice(0, 3).map((blocker, idx) => (
                    <li key={idx} className="text-xs text-red-800 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {betaData.nextSteps.length > 0 && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Next Steps ({betaData.nextSteps.length})
                </h3>
                <ul className="space-y-1">
                  {betaData.nextSteps.slice(0, 3).map((step, idx) => (
                    <li key={idx} className="text-xs text-blue-800 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Workshops */}
      {betaData?.topWorkshops && betaData.topWorkshops.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Performing Workshops</h2>
          <div className="space-y-3">
            {betaData.topWorkshops.map((workshop, idx) => (
              <div
                key={workshop.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-orange-500 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{workshop.name}</div>
                    <div className="text-xs text-slate-400">{workshop.mechanics} mechanics</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    Health: {workshop.healthScore}%
                  </div>
                  <div className={`text-xs ${
                    workshop.healthScore >= 80 ? 'text-green-600' :
                    workshop.healthScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {workshop.healthScore >= 80 ? 'Excellent' :
                     workshop.healthScore >= 60 ? 'Good' : 'Needs Attention'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Claims Management"
          description="Handle customer satisfaction claims"
          href="/admin/claims"
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
        />
        <QuickActionCard
          title="Session Management"
          description="Monitor active and past sessions"
          href="/admin/sessions"
          icon={<Video className="h-5 w-5" />}
          color="green"
        />
        <QuickActionCard
          title="Workshop Analytics"
          description="View detailed workshop metrics"
          href="/admin/analytics/workshop"
          icon={<BarChart3 className="h-5 w-5" />}
          color="blue"
        />
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number | string
  change: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
  subtitle?: string
}

function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  const isPositive = change > 0
  const isNeutral = change === 0

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          isPositive ? 'text-green-600' : isNeutral ? 'text-slate-600' : 'text-red-600'
        }`}>
          {isPositive && <ArrowUpRight className="h-4 w-4" />}
          {!isPositive && !isNeutral && <ArrowDownRight className="h-4 w-4" />}
          {isNeutral && <Minus className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: 'red' | 'green' | 'blue'
}

function QuickActionCard({ title, description, href, icon, color }: QuickActionCardProps) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
  }

  return (
    <a
      href={href}
      className="group rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4 transition hover:border-orange-500 hover:shadow-md"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-white group-hover:text-orange-600 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400">
        {description}
      </p>
    </a>
  )
}
