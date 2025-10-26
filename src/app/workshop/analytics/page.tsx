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
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    currentMonth: null,
    previousMonth: null,
    last6Months: [],
    topMechanics: []
  })

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
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
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/workshop/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">Performance insights and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
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
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            bgColor="bg-green-50"
          />

          <MetricCard
            title="Total Sessions"
            value={currentMonth?.total_sessions || 0}
            growth={sessionsGrowth}
            icon={<Calendar className="h-6 w-6 text-blue-600" />}
            bgColor="bg-blue-50"
          />

          <MetricCard
            title="Active Mechanics"
            value={currentMonth?.active_mechanics_count || 0}
            growth={mechanicsGrowth}
            icon={<Users className="h-6 w-6 text-purple-600" />}
            bgColor="bg-purple-50"
          />

          <MetricCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            growth={0}
            icon={<CheckCircle className="h-6 w-6 text-orange-600" />}
            bgColor="bg-orange-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
            {currentMonth ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Platform Revenue</span>
                  <span className="font-semibold text-gray-900">
                    ${((currentMonth.total_revenue_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Your Share</span>
                  <span className="font-semibold text-green-600">
                    ${((currentMonth.workshop_share_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mechanic Share</span>
                  <span className="font-semibold text-gray-600">
                    ${((currentMonth.mechanic_share_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full"
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
                  <p className="text-xs text-gray-500 mt-2">
                    Your share of total revenue
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">No data available for current month</p>
            )}
          </div>

          {/* Session Stats */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Statistics</h2>
            {currentMonth ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">
                      {currentMonth.completed_sessions}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-900">
                      {currentMonth.cancelled_sessions}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Cancelled</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-900">
                      {currentMonth.total_sessions -
                        currentMonth.completed_sessions -
                        currentMonth.cancelled_sessions}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Pending</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Completion rate:{' '}
                    <span className="font-semibold text-gray-900">
                      {completionRate.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">No data available for current month</p>
            )}
          </div>
        </div>

        {/* Top Performing Mechanics */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Mechanics
          </h2>
          {topMechanics.length > 0 ? (
            <div className="space-y-3">
              {topMechanics.map((mechanic, index) => (
                <div
                  key={mechanic.mechanic_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{mechanic.name}</p>
                      <p className="text-sm text-gray-600">
                        {mechanic.sessions_count} sessions completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {mechanic.sessions_count} sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No mechanics data available</p>
          )}
        </div>

        {/* 6-Month Trend */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">6-Month Trend</h2>
          {last6Months.length > 0 ? (
            <div className="space-y-4">
              {last6Months.map((month) => (
                <div key={month.metric_date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">
                    {new Date(month.metric_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {month.total_sessions} sessions
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${((month.workshop_share_cents || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
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
            <p className="text-sm text-gray-600">No historical data available</p>
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
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 ${bgColor} rounded-lg`}>{icon}</div>
      </div>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {growth !== 0 && (
        <div className="flex items-center gap-1 mt-2">
          <GrowthIcon
            className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
          />
          <span
            className={`text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {Math.abs(growth).toFixed(1)}%
          </span>
          <span className="text-sm text-gray-600">vs last month</span>
        </div>
      )}
    </div>
  )
}
