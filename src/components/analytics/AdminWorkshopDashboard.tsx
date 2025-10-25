'use client'

import React, { useState, useEffect } from 'react'
import { KPICard } from './KPICard'
import { AlertCard, AlertSeverity } from './AlertCard'
import { ConversionFunnel, FunnelStage } from './ConversionFunnel'
import {
  Users,
  Building2,
  Mail,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DashboardData {
  metrics: {
    signups: {
      started: number
      completed: number
      failed: number
    }
    applications: {
      pending: number
      approved: number
      rejected: number
    }
    invitations: {
      sent: number
      accepted: number
      expired: number
    }
    activity: {
      logins: number
      profileUpdates: number
    }
    trends: {
      signups: number
      approvals: number
      invitations: number
      activity: number
    }
  }
  funnel: FunnelStage[]
  alerts: Array<{
    id: string
    alert_type: string
    severity: AlertSeverity
    title: string
    message: string
    created_at: string
    acknowledged: boolean
    metadata?: Record<string, any>
  }>
  workshopHealth: {
    active: number
    pending: number
    suspended: number
    withMechanics: number
    totalMechanics: number
    avgMechanicsPerWorkshop: number
  }
  emailPerformance: {
    total: number
    sent: number
    failed: number
    successRate: number
  }
}

export function AdminWorkshopDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/workshop-overview?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const result = await response.json()
      setData(result)
      setLastRefresh(new Date())
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [period, autoRefresh])

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      })
      if (response.ok) {
        // Refresh dashboard data
        fetchDashboardData()
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard: {error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 text-sm text-red-600 hover:text-red-700"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) return null

  const signupConversionRate = data.metrics.signups.started > 0
    ? Math.round((data.metrics.signups.completed / data.metrics.signups.started) * 100)
    : 0

  const inviteAcceptanceRate = data.metrics.invitations.sent > 0
    ? Math.round((data.metrics.invitations.accepted / data.metrics.invitations.sent) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshop Analytics Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor workshop onboarding, health, and growth metrics
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              autoRefresh
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchDashboardData}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Last Updated */}
          <span className="text-xs text-gray-500">
            Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.alerts.filter(a => a.severity === 'critical').length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Critical Alerts</h2>
          <div className="space-y-2">
            {data.alerts
              .filter(a => a.severity === 'critical')
              .map(alert => (
                <AlertCard
                  key={alert.id}
                  id={alert.id}
                  title={alert.title}
                  message={alert.message}
                  severity={alert.severity}
                  createdAt={alert.created_at}
                  acknowledged={alert.acknowledged}
                  onAcknowledge={handleAcknowledgeAlert}
                  metadata={alert.metadata}
                />
              ))}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Workshops"
          value={data.workshopHealth.active}
          subtitle={`${data.workshopHealth.withMechanics} with mechanics`}
          icon={<Building2 className="h-5 w-5" />}
          trend={{
            value: data.metrics.trends.approvals,
            isPositive: data.metrics.trends.approvals > 0,
          }}
          target={{
            value: 5,
            label: 'for beta',
          }}
        />

        <KPICard
          title="Pending Applications"
          value={data.metrics.applications.pending}
          subtitle="Awaiting approval"
          icon={<Clock className="h-5 w-5" />}
          valueClassName={data.metrics.applications.pending > 5 ? 'text-orange-600' : ''}
        />

        <KPICard
          title="Signup Conversion"
          value={`${signupConversionRate}%`}
          subtitle={`${data.metrics.signups.completed} of ${data.metrics.signups.started}`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{
            value: data.metrics.trends.signups,
            isPositive: data.metrics.trends.signups > 0,
          }}
          target={{
            value: 60,
            label: '%',
          }}
        />

        <KPICard
          title="Invite Acceptance"
          value={`${inviteAcceptanceRate}%`}
          subtitle={`${data.metrics.invitations.accepted} of ${data.metrics.invitations.sent}`}
          icon={<UserPlus className="h-5 w-5" />}
          target={{
            value: 70,
            label: '%',
          }}
        />
      </div>

      {/* Workshop Funnel */}
      <ConversionFunnel
        title="Workshop Onboarding Funnel"
        stages={data.funnel}
        vertical={false}
        showDropoff={true}
      />

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Workshop Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Active</span>
              <span className="font-semibold text-green-600">{data.workshopHealth.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pending</span>
              <span className="font-semibold text-yellow-600">{data.workshopHealth.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Suspended</span>
              <span className="font-semibold text-red-600">{data.workshopHealth.suspended}</span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Mechanics</span>
                <span className="font-semibold">{data.workshopHealth.totalMechanics}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-500">Avg per Workshop</span>
                <span className="font-semibold">
                  {data.workshopHealth.avgMechanicsPerWorkshop}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Email Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Success Rate</span>
              <span className={`font-semibold ${
                data.emailPerformance.successRate >= 98 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {data.emailPerformance.successRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Sent</span>
              <span className="font-semibold">{data.emailPerformance.sent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Failed</span>
              <span className="font-semibold text-red-600">{data.emailPerformance.failed}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Activity Today</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Dashboard Logins</span>
              <span className="font-semibold">{data.metrics.activity.logins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Profile Updates</span>
              <span className="font-semibold">{data.metrics.activity.profileUpdates}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Signups Started</span>
              <span className="font-semibold">{data.metrics.signups.started}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts (Non-Critical) */}
      {data.alerts.filter(a => a.severity !== 'critical').length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Other Alerts</h2>
          <div className="space-y-2">
            {data.alerts
              .filter(a => a.severity !== 'critical')
              .slice(0, 5)
              .map(alert => (
                <AlertCard
                  key={alert.id}
                  id={alert.id}
                  title={alert.title}
                  message={alert.message}
                  severity={alert.severity}
                  createdAt={alert.created_at}
                  acknowledged={alert.acknowledged}
                  onAcknowledge={handleAcknowledgeAlert}
                  metadata={alert.metadata}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}