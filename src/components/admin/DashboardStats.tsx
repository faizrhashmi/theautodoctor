'use client'

import { useEffect, useState } from 'react'
import { Users, Video, AlertCircle, DollarSign, TrendingUp, Clock, Zap } from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeSessions: number
  pendingClaims: number
  revenueToday: number
  totalSessions: number
  todaySessions: number
  weekSessions: number
  totalMechanics: number
  onlineMechanics: number
  pendingIntakes: number
  avgSessionValue: number
  mechanicAvailability: number
  generatedAt: string
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/dashboard/stats')

      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-600 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        <p className="font-medium">Error loading statistics</p>
        <p className="text-sm mt-1 text-red-300">{error}</p>
        <button
          onClick={() => {
            setLoading(true)
            fetchStats()
          }}
          className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions.toLocaleString()}
          icon={<Video className="h-5 w-5" />}
          color="green"
          badge={stats.activeSessions > 0 ? 'LIVE' : undefined}
        />
        <StatCard
          label="Pending Claims"
          value={stats.pendingClaims.toLocaleString()}
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
          badge={stats.pendingClaims > 5 ? 'URGENT' : undefined}
        />
        <StatCard
          label="Revenue Today"
          value={`$${stats.revenueToday.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Today's Sessions"
          value={stats.todaySessions.toLocaleString()}
          icon={<Clock className="h-5 w-5" />}
          color="orange"
          subtitle={`${stats.weekSessions} this week`}
        />
        <StatCard
          label="Online Mechanics"
          value={`${stats.onlineMechanics} / ${stats.totalMechanics}`}
          icon={<Zap className="h-5 w-5" />}
          color="green"
          subtitle={`${stats.mechanicAvailability}% availability`}
        />
        <StatCard
          label="Pending Intakes"
          value={stats.pendingIntakes.toLocaleString()}
          icon={<TrendingUp className="h-5 w-5" />}
          color="indigo"
          subtitle="Waiting for assignment"
        />
      </div>

      {/* Last updated */}
      <div className="text-xs text-slate-400 text-right">
        Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
        <button
          onClick={() => {
            setLoading(true)
            fetchStats()
          }}
          className="ml-2 text-orange-400 hover:text-orange-300 underline transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'
  subtitle?: string
  badge?: string
}

function StatCard({ label, value, icon, color, subtitle, badge }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  }

  const badgeColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500 animate-pulse',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500 animate-pulse',
    indigo: 'bg-indigo-500',
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4 relative hover:border-orange-500/50 transition-all">
      {badge && (
        <span className={`absolute top-2 right-2 ${badgeColors[color]} text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
