'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  XCircle,
  Activity,
  RefreshCw,
} from 'lucide-react'

interface SessionHealthData {
  timestamp: string
  period: string
  overall_health_score: number
  overall_status: string
  total_sessions: number
  anomalies_detected: number
  alerts: {
    incorrect_cancelled: number
    completed_without_start: number
    incorrect_payouts: number
  }
  metrics: {
    completion_rate: number
    cancellation_rate: number
    no_show_rate: number
    avg_duration_minutes: number
  }
  revenue_impact: {
    sessions_at_risk: number
    revenue_at_risk_usd: number
  }
}

interface SessionHealthDashboardProps {
  initialData: SessionHealthData | null
}

export default function SessionHealthDashboard({ initialData }: SessionHealthDashboardProps) {
  const [healthData, setHealthData] = useState<SessionHealthData | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const supabase = createClient()

  const refreshData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('session_health_dashboard')

      if (error) {
        console.error('Error fetching health data:', error)
      } else {
        setHealthData(data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error refreshing health data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(refreshData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading health data...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'GOOD':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'NEEDS ATTENTION':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return <CheckCircle2 className="h-8 w-8" />
      case 'GOOD':
        return <CheckCircle2 className="h-8 w-8" />
      case 'NEEDS ATTENTION':
        return <AlertCircle className="h-8 w-8" />
      case 'CRITICAL':
        return <AlertTriangle className="h-8 w-8" />
      default:
        return <Activity className="h-8 w-8" />
    }
  }

  const totalAlerts =
    healthData.alerts.incorrect_cancelled +
    healthData.alerts.completed_without_start +
    healthData.alerts.incorrect_payouts

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Health Score */}
      <div className={`p-6 rounded-lg border ${getStatusColor(healthData.overall_status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1">Overall Health Status</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                {healthData.overall_health_score.toFixed(1)}
              </span>
              <span className="text-lg">/  100</span>
            </div>
            <p className="text-sm mt-2 font-semibold">{healthData.overall_status}</p>
          </div>
          <div>{getStatusIcon(healthData.overall_status)}</div>
        </div>

        {totalAlerts > 0 && (
          <div className="mt-4 pt-4 border-t border-current/20">
            <p className="text-sm font-medium">
              ⚠️ {totalAlerts} anomal{totalAlerts === 1 ? 'y' : 'ies'} detected in the last 24
              hours
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Sessions</p>
              <p className="text-2xl font-bold text-white">
                {healthData.total_sessions.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Last 24 hours</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Completion Rate</p>
              <p className="text-2xl font-bold text-white">
                {healthData.metrics.completion_rate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <p className="text-xs text-slate-500">Sessions marked completed</p>
          </div>
        </div>

        {/* No-Show Rate */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <XCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">No-Show Rate</p>
              <p className="text-2xl font-bold text-white">
                {healthData.metrics.no_show_rate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Never started sessions</p>
        </div>

        {/* Average Duration */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Duration</p>
              <p className="text-2xl font-bold text-white">
                {healthData.metrics.avg_duration_minutes.toFixed(1)}m
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Completed sessions only</p>
        </div>
      </div>

      {/* Alerts Section */}
      {totalAlerts > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Active Alerts
          </h3>

          <div className="space-y-3">
            {healthData.alerts.incorrect_cancelled > 0 && (
              <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div>
                  <p className="font-medium text-red-400">Incorrect Cancelled Status</p>
                  <p className="text-sm text-slate-400">
                    Sessions marked cancelled that should be completed
                  </p>
                </div>
                <span className="text-2xl font-bold text-red-400">
                  {healthData.alerts.incorrect_cancelled}
                </span>
              </div>
            )}

            {healthData.alerts.completed_without_start > 0 && (
              <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div>
                  <p className="font-medium text-orange-400">Missing Start Timestamp</p>
                  <p className="text-sm text-slate-400">
                    Completed sessions without started_at timestamp
                  </p>
                </div>
                <span className="text-2xl font-bold text-orange-400">
                  {healthData.alerts.completed_without_start}
                </span>
              </div>
            )}

            {healthData.alerts.incorrect_payouts > 0 && (
              <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div>
                  <p className="font-medium text-red-400">🚨 Incorrect Payouts</p>
                  <p className="text-sm text-slate-400">
                    Payouts sent for cancelled sessions - FINANCIAL ISSUE
                  </p>
                </div>
                <span className="text-2xl font-bold text-red-400">
                  {healthData.alerts.incorrect_payouts}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <a
              href="/admin/sessions/review"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              View sessions needing review →
            </a>
          </div>
        </div>
      )}

      {/* Revenue Impact */}
      {healthData.revenue_impact.sessions_at_risk > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg border border-red-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-500" />
            Revenue Impact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Sessions At Risk</p>
              <p className="text-3xl font-bold text-red-400">
                {healthData.revenue_impact.sessions_at_risk}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Sessions incorrectly marked that should generate revenue
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Potential Revenue Loss</p>
              <p className="text-3xl font-bold text-red-400">
                ${healthData.revenue_impact.revenue_at_risk_usd.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Based on plan prices</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 font-medium">
              ⚠️ Action Required: These sessions need manual review and correction
            </p>
          </div>
        </div>
      )}

      {/* Status Distribution */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Completed</span>
              <span className="text-white font-medium">
                {healthData.metrics.completion_rate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${healthData.metrics.completion_rate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Cancelled</span>
              <span className="text-white font-medium">
                {healthData.metrics.cancellation_rate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${healthData.metrics.cancellation_rate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">No-Show (subset of cancelled)</span>
              <span className="text-white font-medium">
                {healthData.metrics.no_show_rate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${healthData.metrics.no_show_rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Health Check Summary */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Health Check Summary</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {healthData.alerts.incorrect_cancelled === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <p className="text-sm text-slate-300">
              Session status logic working correctly (no cancelled sessions with valid duration)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {healthData.alerts.completed_without_start === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <p className="text-sm text-slate-300">
              All completed sessions have valid start timestamps
            </p>
          </div>

          <div className="flex items-center gap-3">
            {healthData.alerts.incorrect_payouts === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <p className="text-sm text-slate-300">
              Payouts only processed for completed sessions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {healthData.overall_health_score >= 95 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            )}
            <p className="text-sm text-slate-300">Overall system health above 95%</p>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>📚 Documentation:</strong> Learn more about session end logic semantics and
          monitoring in the{' '}
          <a
            href="/admin/docs/session-end-logic"
            className="underline hover:text-blue-300"
          >
            admin documentation
          </a>
          .
        </p>
      </div>
    </div>
  )
}
