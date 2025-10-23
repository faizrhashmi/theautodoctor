// @ts-nocheck
// src/app/admin/(shell)/DashboardClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Wrench,
  Activity,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MetricsCard } from '@/components/admin/MetricsCard'
import { SystemHealth } from '@/components/admin/SystemHealth'
import { ActivityFeed } from '@/components/admin/ActivityFeed'
import { QuickActions } from '@/components/admin/QuickActions'

interface DashboardData {
  metrics: {
    activeSessions: number
    totalCustomers: number
    totalMechanics: number
    onlineMechanics: number
    pendingRequests: number
    unattendedRequests: number
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    customerTrend24h: number
    customerTrend7d: number
    customerTrend30d: number
  }
  systemHealth: {
    databaseStatus: 'healthy' | 'degraded' | 'down'
    supabaseStatus: 'healthy' | 'degraded' | 'down'
    livekitStatus: 'healthy' | 'degraded' | 'down'
    stripeStatus: 'healthy' | 'degraded' | 'down'
    lastCleanup?: string
    errorRate: number
  }
  recentActivity: Array<{
    id: string
    type: 'session' | 'request' | 'error'
    title: string
    description: string
    timestamp: string
    status?: string
  }>
  chartData: {
    sessionsOverTime: Array<{ date: string; sessions: number }>
    sessionTypes: Array<{ name: string; value: number }>
    revenueTrend: Array<{ date: string; revenue: number }>
    customerAcquisition: Array<{ date: string; customers: number }>
  }
}

interface DashboardClientProps {
  data: DashboardData
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  slate: '#64748b',
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export function DashboardClient({ data: initialData }: DashboardClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true)
      router.refresh()
      setTimeout(() => setIsRefreshing(false), 1000)
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  const handleRunCleanup = async () => {
    try {
      const response = await fetch('/admin/cleanup', { method: 'POST' })
      if (response.ok) {
        alert('Cleanup completed successfully')
        router.refresh()
      } else {
        alert('Cleanup failed')
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      alert('Cleanup failed')
    }
  }

  const handleViewUnattended = () => {
    router.push('/admin/unattended')
  }

  const handleCancelSessions = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel all stuck sessions? This action cannot be undone.'
      )
    ) {
      return
    }
    // TODO: Implement force cancel endpoint
    alert('Feature coming soon')
  }

  const handleExportAnalytics = async () => {
    // TODO: Implement export functionality
    alert('Feature coming soon')
  }

  const handleViewLogs = () => {
    // TODO: Implement logs page
    alert('Feature coming soon')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Real-time overview of your platform&apos;s performance and health
          </p>
        </div>
        {isRefreshing && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span>Refreshing...</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Active Sessions"
          value={initialData.metrics.activeSessions}
          icon={Activity}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          description="Currently live sessions"
        />
        <MetricsCard
          title="Total Customers"
          value={initialData.metrics.totalCustomers}
          icon={Users}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
          trend={{
            value: initialData.metrics.customerTrend7d,
            label: 'from last 7 days',
            isPositive: initialData.metrics.customerTrend7d > 0,
          }}
        />
        <MetricsCard
          title="Mechanics"
          value={initialData.metrics.totalMechanics}
          icon={Wrench}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          description={`${initialData.metrics.onlineMechanics} online now`}
        />
        <MetricsCard
          title="Pending Requests"
          value={initialData.metrics.pendingRequests}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
      </div>

      {/* Revenue and Alerts */}
      <div className="grid gap-6 md:grid-cols-3">
        <MetricsCard
          title="Today's Revenue"
          value={formatCurrency(initialData.metrics.todayRevenue)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <MetricsCard
          title="Week Revenue"
          value={formatCurrency(initialData.metrics.weekRevenue)}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <MetricsCard
          title="Unattended Requests"
          value={initialData.metrics.unattendedRequests}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sessions Over Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Sessions Over Time</h3>
          <p className="mt-1 text-sm text-slate-600">Last 7 days activity</p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={initialData.chartData.sessionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Session Types Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Session Types</h3>
          <p className="mt-1 text-sm text-slate-600">Current distribution</p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={initialData.chartData.sessionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name} ${(entry.percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {initialData.chartData.sessionTypes.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Acquisition */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Customer Acquisition
          </h3>
          <p className="mt-1 text-sm text-slate-600">New customers per day</p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={initialData.chartData.customerAcquisition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="customers" fill={COLORS.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend - Placeholder */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
          <p className="mt-1 text-sm text-slate-600">Last 7 days earnings</p>
          <div className="mt-6 flex h-80 items-center justify-center">
            <div className="text-center">
              <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm text-slate-600">
                Revenue tracking coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealth
          databaseStatus={initialData.systemHealth.databaseStatus}
          supabaseStatus={initialData.systemHealth.supabaseStatus}
          livekitStatus={initialData.systemHealth.livekitStatus}
          stripeStatus={initialData.systemHealth.stripeStatus}
          lastCleanup={initialData.systemHealth.lastCleanup}
          errorRate={initialData.systemHealth.errorRate}
        />
        <QuickActions
          onRunCleanup={handleRunCleanup}
          onViewUnattended={handleViewUnattended}
          onCancelSessions={handleCancelSessions}
          onExportAnalytics={handleExportAnalytics}
          onViewLogs={handleViewLogs}
        />
      </div>

      {/* Activity Feed */}
      <ActivityFeed initialActivities={initialData.recentActivity} />
    </div>
  )
}
