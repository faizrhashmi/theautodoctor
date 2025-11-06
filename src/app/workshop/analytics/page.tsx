'use client'

/**
 * Workshop Analytics Page
 * Performance metrics and insights for workshop owners
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface WorkshopMetrics {
  total_sessions: number
  completed_sessions: number
  cancelled_sessions: number
  total_revenue_cents: number
  workshop_share_cents: number
  mechanic_share_cents: number
  active_mechanics_count: number
  metric_date: string
}

interface AnalyticsData {
  currentMonth: WorkshopMetrics | null
  previousMonth: WorkshopMetrics | null
  last6Months: WorkshopMetrics[]
  topMechanics: Array<{
    mechanic_id: string
    name: string
    sessions_count: number
    total_revenue: number
  }>
}

export default function WorkshopAnalyticsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData>({
    currentMonth: null,
    previousMonth: null,
    last6Months: [],
    topMechanics: []
  })

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get workshop user ID from session without direct auth check
      const { data: { user } } = await supabase.auth.getUser()

      // If no user, layout will handle redirect - just show loading
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch current month metrics
      const currentDate = new Date()
      const currentMonth = currentDate.toISOString().slice(0, 7)

      const { data: currentMetrics } = await supabase
        .from('workshop_metrics')
        .select('*')
        .eq('workshop_id', user.id)
        .gte('metric_date', `${currentMonth}-01`)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single()

      // Fetch previous month metrics
      const prevDate = new Date(currentDate)
      prevDate.setMonth(prevDate.getMonth() - 1)
      const prevMonth = prevDate.toISOString().slice(0, 7)

      const { data: prevMetrics } = await supabase
        .from('workshop_metrics')
        .select('*')
        .eq('workshop_id', user.id)
        .gte('metric_date', `${prevMonth}-01`)
        .lt('metric_date', `${currentMonth}-01`)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single()

      // Fetch last 6 months
      const sixMonthsAgo = new Date(currentDate)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 7)

      const { data: last6MonthsData } = await supabase
        .from('workshop_metrics')
        .select('*')
        .eq('workshop_id', user.id)
        .gte('metric_date', `${sixMonthsAgoStr}-01`)
        .order('metric_date', { ascending: true })

      // Fetch top mechanics (from workshop_mechanics + sessions count)
      const { data: mechanics } = await supabase
        .from('workshop_mechanics')
        .select(`
          mechanic_id,
          mechanics (
            id,
            name
          )
        `)
        .eq('workshop_id', user.id)
        .eq('status', 'active')

      // Calculate metrics for each mechanic
      const mechanicsWithMetrics = await Promise.all(
        (mechanics || []).map(async (wm: any) => {
          const { count: sessionCount } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('mechanic_id', wm.mechanic_id)
            .eq('status', 'completed')

          return {
            mechanic_id: wm.mechanic_id,
            name: wm.mechanics?.name || 'Unknown',
            sessions_count: sessionCount || 0,
            total_revenue: 0 // TODO: Calculate from sessions
          }
        })
      )

      // Sort by sessions count
      mechanicsWithMetrics.sort((a, b) => b.sessions_count - a.sessions_count)

      setData({
        currentMonth: currentMetrics || null,
        previousMonth: prevMetrics || null,
        last6Months: last6MonthsData || [],
        topMechanics: mechanicsWithMetrics.slice(0, 5)
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8 rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Analytics</h2>
          <p className="text-sm text-red-200">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="mt-6 rounded-lg bg-purple-500 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { currentMonth, previousMonth, last6Months, topMechanics } = data

  // Calculate month-over-month growth
  const calculateGrowth = (current?: number, previous?: number) => {
    if (!current || !previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const revenueGrowth = calculateGrowth(
    currentMonth?.workshop_share_cents,
    previousMonth?.workshop_share_cents
  )
  const sessionsGrowth = calculateGrowth(
    currentMonth?.total_sessions,
    previousMonth?.total_sessions
  )
  const mechanicsGrowth = calculateGrowth(
    currentMonth?.active_mechanics_count,
    previousMonth?.active_mechanics_count
  )

  const completionRate = currentMonth
    ? currentMonth.total_sessions > 0
      ? (currentMonth.completed_sessions / currentMonth.total_sessions) * 100
      : 0
    : 0

  return (
    <div>
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/workshop/dashboard"
                className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-slate-400 mt-1">Performance insights and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Month Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Workshop Revenue"
            value={`$${((currentMonth?.workshop_share_cents || 0) / 100).toFixed(2)}`}
            growth={revenueGrowth}
            icon={<DollarSign className="h-6 w-6 text-green-400" />}
            bgColor="bg-green-500/20"
          />

          <MetricCard
            title="Total Sessions"
            value={currentMonth?.total_sessions || 0}
            growth={sessionsGrowth}
            icon={<Calendar className="h-6 w-6 text-purple-400" />}
            bgColor="bg-purple-500/20"
          />

          <MetricCard
            title="Active Mechanics"
            value={currentMonth?.active_mechanics_count || 0}
            growth={mechanicsGrowth}
            icon={<Users className="h-6 w-6 text-purple-400" />}
            bgColor="bg-purple-500/20"
          />

          <MetricCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            growth={0}
            icon={<CheckCircle className="h-6 w-6 text-purple-400" />}
            bgColor="bg-purple-500/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Breakdown */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h2>
            {currentMonth ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total Platform Revenue</span>
                  <span className="font-semibold text-white">
                    ${((currentMonth.total_revenue_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Your Share</span>
                  <span className="font-semibold text-green-400">
                    ${((currentMonth.workshop_share_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Mechanic Share</span>
                  <span className="font-semibold text-slate-300">
                    ${((currentMonth.mechanic_share_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full"
                      style={{
                        width: `${
                          currentMonth.total_revenue_cents > 0
                            ? (currentMonth.workshop_share_cents /
                                currentMonth.total_revenue_cents) *
                              100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Your share of total revenue
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No data available for current month</p>
            )}
          </div>

          {/* Session Stats */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Session Statistics</h2>
            {currentMonth ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">
                      {currentMonth.completed_sessions}
                    </p>
                    <p className="text-xs text-green-300 mt-1">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                    <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">
                      {currentMonth.cancelled_sessions}
                    </p>
                    <p className="text-xs text-red-300 mt-1">Cancelled</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">
                      {currentMonth.total_sessions -
                        currentMonth.completed_sessions -
                        currentMonth.cancelled_sessions}
                    </p>
                    <p className="text-xs text-yellow-300 mt-1">Pending</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400">
                    Completion rate:{' '}
                    <span className="font-semibold text-white">
                      {completionRate.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No data available for current month</p>
            )}
          </div>
        </div>

        {/* Top Performing Mechanics */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Top Performing Mechanics
          </h2>
          {topMechanics.length > 0 ? (
            <div className="space-y-3">
              {topMechanics.map((mechanic, index) => (
                <div
                  key={mechanic.mechanic_id}
                  className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 text-purple-400 font-bold rounded-full">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{mechanic.name}</p>
                      <p className="text-sm text-slate-400">
                        {mechanic.sessions_count} sessions completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {mechanic.sessions_count} sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No mechanics data available</p>
          )}
        </div>

        {/* 6-Month Trend */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">6-Month Trend</h2>
          {last6Months.length > 0 ? (
            <div className="space-y-4">
              {last6Months.map((month) => (
                <div key={month.metric_date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-slate-400">
                    {new Date(month.metric_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-400">
                        {month.total_sessions} sessions
                      </span>
                      <span className="text-sm font-semibold text-white">
                        ${((month.workshop_share_cents || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (month.total_sessions / 50) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No historical data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  growth: number
  icon: React.ReactNode
  bgColor: string
}

function MetricCard({ title, value, growth, icon, bgColor }: MetricCardProps) {
  const isPositive = growth >= 0
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 ${bgColor} rounded-lg`}>{icon}</div>
      </div>
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {growth !== 0 && (
        <div className="flex items-center gap-1 mt-2">
          <GrowthIcon
            className={`h-4 w-4 ${isPositive ? 'text-green-400' : 'text-red-400'}`}
          />
          <span
            className={`text-sm font-medium ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {Math.abs(growth).toFixed(1)}%
          </span>
          <span className="text-sm text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  )
}
