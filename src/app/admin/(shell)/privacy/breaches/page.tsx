'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DataBreach {
  id: string
  breach_title: string
  breach_description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  discovered_at: string
  contained_at: string | null
  remediated_at: string | null
  affected_customer_count: number
  data_types_affected: string[]
  breach_cause: string | null
  response_status: 'discovered' | 'investigating' | 'contained' | 'notifying' | 'remediated' | 'closed'
  privacy_commissioner_notified: boolean
  privacy_commissioner_notified_at: string | null
  customers_notified: boolean
  customers_notified_at: string | null
  notification_method: string | null
  remediation_steps: string | null
  discovered_by: string | null
  handled_by: string | null
  created_at: string
  updated_at: string
}

export default function DataBreachesPage() {
  const [breaches, setBreaches] = useState<DataBreach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'critical'>('active')

  const fetchBreaches = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/privacy/breaches')

      if (!response.ok) {
        throw new Error('Failed to fetch data breaches')
      }

      const data = await response.json()
      setBreaches(data.breaches || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching breaches:', err)
      setError(err instanceof Error ? err.message : 'Failed to load breaches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBreaches()
  }, [])

  const filteredBreaches = breaches.filter((breach) => {
    if (filter === 'active' && breach.response_status === 'closed') return false
    if (filter === 'critical' && !['critical', 'high'].includes(breach.severity)) return false
    return true
  })

  const stats = {
    total: breaches.length,
    active: breaches.filter((b) => b.response_status !== 'closed').length,
    critical: breaches.filter((b) => ['critical', 'high'].includes(b.severity) && b.response_status !== 'closed')
      .length,
    unnotified: breaches.filter((b) => !b.privacy_commissioner_notified && b.response_status !== 'closed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading breach data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Breaches</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchBreaches}
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
          <h1 className="text-3xl font-bold text-white">Data Breach Management</h1>
          <p className="text-slate-400 mt-1">PIPEDA Breach Response & Notification</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBreaches}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/admin/privacy/breaches/new"
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Report Breach
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Breaches"
          value={stats.total}
          icon="📋"
          color="blue"
        />
        <StatCard
          title="Active Incidents"
          value={stats.active}
          icon="🔥"
          color={stats.active > 0 ? "orange" : "gray"}
          alert={stats.active > 0}
        />
        <StatCard
          title="Critical/High"
          value={stats.critical}
          icon="🚨"
          color={stats.critical > 0 ? "red" : "gray"}
          alert={stats.critical > 0}
        />
        <StatCard
          title="Pending Notification"
          value={stats.unnotified}
          icon="⚠️"
          color={stats.unnotified > 0 ? "yellow" : "gray"}
          alert={stats.unnotified > 0}
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All Breaches"
          />
          <FilterButton
            active={filter === 'active'}
            onClick={() => setFilter('active')}
            label="Active Only"
            color="orange"
          />
          <FilterButton
            active={filter === 'critical'}
            onClick={() => setFilter('critical')}
            label="Critical/High"
            color="red"
          />
        </div>
      </div>

      {/* Breaches List */}
      {filteredBreaches.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Breaches Found</h3>
          <p className="text-slate-400">
            {filter === 'all'
              ? 'No data breaches have been reported.'
              : filter === 'active'
              ? 'No active breach incidents.'
              : 'No critical or high severity breaches.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBreaches.map((breach) => (
            <BreachCard key={breach.id} breach={breach} onUpdate={fetchBreaches} />
          ))}
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  alert = false,
}: {
  title: string
  value: number
  icon: string
  color: string
  alert?: boolean
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    gray: 'border-slate-700 bg-slate-800/50',
  }

  return (
    <div className={`border rounded-xl p-4 ${colorClasses[color] || colorClasses.gray} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{title}</div>
    </div>
  )
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  label,
  color = 'blue',
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  const activeClass = active
    ? 'bg-blue-500 text-white'
    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeClass}`}
    >
      {label}
    </button>
  )
}

// Breach Card Component
function BreachCard({ breach, onUpdate }: { breach: DataBreach; onUpdate: () => void }) {
  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      critical: { bg: 'bg-red-500', text: 'text-white', label: 'CRITICAL' },
      high: { bg: 'bg-orange-500', text: 'text-white', label: 'HIGH' },
      medium: { bg: 'bg-yellow-500', text: 'text-slate-900', label: 'MEDIUM' },
      low: { bg: 'bg-blue-500', text: 'text-white', label: 'LOW' },
    }

    const badge = badges[severity] || badges.medium
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      discovered: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🔍 Discovered' },
      investigating: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '🔎 Investigating' },
      contained: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🛡️ Contained' },
      notifying: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '📧 Notifying' },
      remediated: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Remediated' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '🔒 Closed' },
    }

    const badge = badges[status] || badges.discovered
    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const daysSince = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const isUrgent = () => {
    return (
      ['critical', 'high'].includes(breach.severity) &&
      breach.response_status !== 'closed' &&
      (!breach.privacy_commissioner_notified || !breach.customers_notified)
    )
  }

  return (
    <div
      className={`bg-slate-800/50 border rounded-xl p-6 ${
        isUrgent() ? 'border-red-500 animate-pulse' : 'border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getSeverityBadge(breach.severity)}
            {getStatusBadge(breach.response_status)}
            {isUrgent() && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
                URGENT
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-white mb-1">{breach.breach_title}</h3>
          <p className="text-slate-300 text-sm">{breach.breach_description}</p>
        </div>
        <Link
          href={`/admin/privacy/breaches/${breach.id}`}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap ml-4"
        >
          Manage →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Discovered</div>
          <div className="text-sm text-white">{formatDate(breach.discovered_at)}</div>
          <div className="text-xs text-slate-400">{daysSince(breach.discovered_at)} days ago</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Affected Customers</div>
          <div className="text-2xl font-bold text-white">{breach.affected_customer_count.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Privacy Commissioner</div>
          <div className={`text-sm font-medium ${breach.privacy_commissioner_notified ? 'text-green-400' : 'text-red-400'}`}>
            {breach.privacy_commissioner_notified ? '✓ Notified' : '✗ Not Notified'}
          </div>
          {breach.privacy_commissioner_notified_at && (
            <div className="text-xs text-slate-400">{formatDate(breach.privacy_commissioner_notified_at)}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Customer Notifications</div>
          <div className={`text-sm font-medium ${breach.customers_notified ? 'text-green-400' : 'text-red-400'}`}>
            {breach.customers_notified ? '✓ Notified' : '✗ Not Notified'}
          </div>
          {breach.customers_notified_at && (
            <div className="text-xs text-slate-400">{formatDate(breach.customers_notified_at)}</div>
          )}
        </div>
      </div>

      {breach.data_types_affected && breach.data_types_affected.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2">Data Types Affected</div>
          <div className="flex flex-wrap gap-2">
            {breach.data_types_affected.map((dataType) => (
              <span key={dataType} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                {dataType}
              </span>
            ))}
          </div>
        </div>
      )}

      {isUrgent() && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <span>⚠️</span>
            <span>Action Required:</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-300">
            {!breach.privacy_commissioner_notified && <li>• Notify Privacy Commissioner (PIPEDA requirement)</li>}
            {!breach.customers_notified && <li>• Notify affected customers</li>}
            {breach.response_status === 'discovered' && <li>• Begin investigation immediately</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
