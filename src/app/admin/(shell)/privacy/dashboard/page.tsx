// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardMetrics {
  // Customer Consent Metrics
  total_customers_with_consents: number
  customers_fully_compliant: number
  customers_opted_in_marketing: number

  // Data Access Requests
  data_access_requests_30_days: number
  data_access_requests_overdue: number

  // Account Deletions
  pending_deletion_requests: number
  deletions_completed_30_days: number

  // Data Breaches
  active_data_breaches: number
  critical_high_breaches: number

  // Privacy Activity
  privacy_events_24_hours: number
  opt_outs_7_days: number
}

interface ComplianceScore {
  total_customers: number
  compliant_customers: number
  non_compliant_customers: number
  compliance_score: number
  compliance_grade: string
}

export default function PrivacyDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/privacy/metrics')

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics')
      }

      const data = await response.json()
      setMetrics(data.dashboardSummary)
      setComplianceScore(data.complianceScore)
      setError(null)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-500'
    if (grade.startsWith('B')) return 'text-blue-500'
    if (grade.startsWith('C')) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading privacy compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Dashboard</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Privacy Compliance Dashboard</h1>
          <p className="text-slate-400 mt-1">PIPEDA & CASL Compliance Monitoring</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Compliance Score Card */}
      {complianceScore && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Overall PIPEDA Compliance</h2>
              <p className="text-slate-300">
                {complianceScore.compliant_customers} of {complianceScore.total_customers} customers fully compliant
              </p>
            </div>
            <div className="text-center">
              <div className={`text-6xl font-bold ${getGradeColor(complianceScore.compliance_grade)}`}>
                {complianceScore.compliance_grade}
              </div>
              <div className="text-2xl text-slate-400 mt-2">
                {complianceScore.compliance_score.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getComplianceColor(complianceScore.compliance_score)}`}
              style={{ width: `${complianceScore.compliance_score}%` }}
            />
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consent Metrics */}
        <MetricCard
          title="Total Consents"
          value={metrics?.total_customers_with_consents || 0}
          icon="✅"
          color="blue"
          subtitle="Customers with active consents"
        />

        <MetricCard
          title="Marketing Opt-ins"
          value={metrics?.customers_opted_in_marketing || 0}
          icon="📧"
          color="green"
          subtitle="CASL marketing consents"
        />

        {/* Data Access Requests */}
        <MetricCard
          title="Access Requests (30d)"
          value={metrics?.data_access_requests_30_days || 0}
          icon="📋"
          color="purple"
          subtitle="PIPEDA data access requests"
        />

        <MetricCard
          title="Overdue Requests"
          value={metrics?.data_access_requests_overdue || 0}
          icon="⚠️"
          color={metrics?.data_access_requests_overdue > 0 ? "red" : "gray"}
          subtitle="Past 30-day deadline"
          alert={metrics?.data_access_requests_overdue > 0}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Deletions"
          value={metrics?.pending_deletion_requests || 0}
          icon="🗑️"
          color="orange"
          subtitle="Account deletion requests"
        />

        <MetricCard
          title="Active Breaches"
          value={metrics?.active_data_breaches || 0}
          icon="🚨"
          color={metrics?.active_data_breaches > 0 ? "red" : "gray"}
          subtitle="Open breach incidents"
          alert={metrics?.active_data_breaches > 0}
        />

        <MetricCard
          title="Recent Opt-outs"
          value={metrics?.opt_outs_7_days || 0}
          icon="📉"
          color="yellow"
          subtitle="Last 7 days"
        />

        <MetricCard
          title="Privacy Events (24h)"
          value={metrics?.privacy_events_24_hours || 0}
          icon="📊"
          color="blue"
          subtitle="Audit log activity"
        />
      </div>

      {/* Critical Alerts */}
      {(metrics?.data_access_requests_overdue > 0 ||
        metrics?.critical_high_breaches > 0 ||
        metrics?.active_data_breaches > 0) && (
        <div className="bg-red-500/10 border border-red-500 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-500 mb-4 flex items-center gap-2">
            <span>🚨</span>
            Critical Compliance Alerts
          </h2>
          <div className="space-y-3">
            {metrics.data_access_requests_overdue > 0 && (
              <AlertItem
                title="Overdue Data Access Requests"
                description={`${metrics.data_access_requests_overdue} requests exceed PIPEDA 30-day requirement`}
                action="View Requests"
                href="/admin/privacy/data-access"
              />
            )}
            {metrics.critical_high_breaches > 0 && (
              <AlertItem
                title="Critical Data Breaches"
                description={`${metrics.critical_high_breaches} high/critical severity breaches require immediate attention`}
                action="View Breaches"
                href="/admin/privacy/breaches"
              />
            )}
            {metrics.active_data_breaches > 0 && (
              <AlertItem
                title="Active Data Breaches"
                description={`${metrics.active_data_breaches} breach incidents currently being managed`}
                action="Manage Breaches"
                href="/admin/privacy/breaches"
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickLink href="/admin/privacy/consents" icon="📝" label="Consents" />
          <QuickLink href="/admin/privacy/data-access" icon="📋" label="Data Access" />
          <QuickLink href="/admin/privacy/deletions" icon="🗑️" label="Deletions" />
          <QuickLink href="/admin/privacy/breaches" icon="🚨" label="Breaches" />
          <QuickLink href="/admin/privacy/audit-log" icon="📜" label="Audit Log" />
          <QuickLink href="/admin/privacy/reports" icon="📊" label="Reports" />
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon,
  color,
  subtitle,
  alert = false,
}: {
  title: string
  value: number
  icon: string
  color: string
  subtitle?: string
  alert?: boolean
}) {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    gray: 'border-slate-700 bg-slate-800/50',
  }

  return (
    <div className={`border rounded-xl p-4 ${colorClasses[color] || colorClasses.gray} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {alert && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">
        {value.toLocaleString()}
      </div>
      <div className="text-sm font-medium text-slate-300">{title}</div>
      {subtitle && (
        <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

// Alert Item Component
function AlertItem({
  title,
  description,
  action,
  href,
}: {
  title: string
  description: string
  action: string
  href: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>
      <Link
        href={href}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 whitespace-nowrap transition-colors"
      >
        {action}
      </Link>
    </div>
  )
}

// Quick Link Component
function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
    </Link>
  )
}
