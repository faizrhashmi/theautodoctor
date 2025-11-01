'use client'

import { useState, useEffect } from 'react'

interface DataAccessRequest {
  request_id: string
  customer_id: string
  email: string
  full_name: string
  requested_at: string
  days_pending: number
  status: 'on_track' | 'warning' | 'urgent' | 'overdue'
  download_generated: boolean
  ip_address: string | null
  event_details: Record<string, unknown>
}

export default function DataAccessRequestsPage() {
  const [requests, setRequests] = useState<DataAccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('pending')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/privacy/data-access')

      if (!response.ok) {
        throw new Error('Failed to fetch data access requests')
      }

      const data = await response.json()
      setRequests(data.requests || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const filteredRequests = requests.filter((request) => {
    if (filter === 'pending' && request.download_generated) return false
    if (filter === 'urgent' && !['urgent', 'overdue'].includes(request.status)) return false
    return true
  })

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => !r.download_generated).length,
    urgent: requests.filter((r) => ['urgent', 'overdue'].includes(r.status)).length,
    overdue: requests.filter((r) => r.status === 'overdue').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading data access requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Requests</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchRequests}
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
          <h1 className="text-3xl font-bold text-white">Data Access Requests</h1>
          <p className="text-slate-400 mt-1">PIPEDA 30-Day Compliance Tracking</p>
        </div>
        <button
          onClick={fetchRequests}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* PIPEDA Notice */}
      <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">PIPEDA Requirement</h3>
            <p className="text-sm text-slate-300">
              Organizations must respond to data access requests within <strong>30 days</strong> of receipt.
              Failing to respond may result in Privacy Commissioner complaints and penalties.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon="📋" color="blue" />
        <StatCard
          title="Pending Response"
          value={stats.pending}
          icon="⏳"
          color={stats.pending > 0 ? 'yellow' : 'gray'}
          alert={stats.pending > 0}
        />
        <StatCard
          title="Urgent (25+ days)"
          value={stats.urgent}
          icon="⚠️"
          color={stats.urgent > 0 ? 'orange' : 'gray'}
          alert={stats.urgent > 0}
        />
        <StatCard
          title="Overdue (30+ days)"
          value={stats.overdue}
          icon="🚨"
          color={stats.overdue > 0 ? 'red' : 'gray'}
          alert={stats.overdue > 0}
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All Requests"
          />
          <FilterButton
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            label="Pending Only"
            color="yellow"
          />
          <FilterButton
            active={filter === 'urgent'}
            onClick={() => setFilter('urgent')}
            label="Urgent/Overdue"
            color="red"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
          <p className="text-slate-400">
            {filter === 'all'
              ? 'No data access requests have been submitted.'
              : filter === 'pending'
              ? 'No pending data access requests.'
              : 'No urgent or overdue requests.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Requested</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Days Pending</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Response</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredRequests.map((request) => (
                  <RequestRow key={request.request_id} request={request} onUpdate={fetchRequests} />
                ))}
              </tbody>
            </table>
          </div>
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
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    red: 'border-red-500/30 bg-red-500/10',
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

// Request Row Component
function RequestRow({ request, onUpdate }: { request: DataAccessRequest; onUpdate: () => void }) {
  const [generating, setGenerating] = useState(false)

  const getStatusBadge = (status: string, days: number) => {
    const badges = {
      on_track: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✓ On Track', icon: '✓' },
      warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '⚠️ Warning', icon: '⚠️' },
      urgent: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '🔥 Urgent', icon: '🔥' },
      overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🚨 OVERDUE', icon: '🚨' },
    }

    const badge = badges[status] || badges.on_track
    return (
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text} inline-block`}>
          {badge.label}
        </span>
        <span className="text-xs text-slate-500">
          {30 - days} days remaining
        </span>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleGenerateDownload = async () => {
    if (!confirm(`Generate data download for ${request.full_name}?`)) {
      return
    }

    try {
      setGenerating(true)
      const response = await fetch(`/api/admin/privacy/data-access/${request.customer_id}/generate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate data download')
      }

      alert('Data download generated successfully. Customer will be notified via email.')
      onUpdate()
    } catch (err) {
      alert('Error generating download: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-white">{request.full_name}</div>
          <div className="text-xs text-slate-400">{request.email}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-white">{formatDate(request.requested_at)}</div>
      </td>
      <td className="px-4 py-3">
        <div className={`text-2xl font-bold ${
          request.days_pending > 30 ? 'text-red-400' :
          request.days_pending > 25 ? 'text-orange-400' :
          request.days_pending > 20 ? 'text-yellow-400' :
          'text-green-400'
        }`}>
          {request.days_pending}
        </div>
        <div className="text-xs text-slate-400">days</div>
      </td>
      <td className="px-4 py-3">
        {getStatusBadge(request.status, request.days_pending)}
      </td>
      <td className="px-4 py-3">
        {request.download_generated ? (
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            ✓ Generated
          </span>
        ) : (
          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-400">
            Pending
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {!request.download_generated && (
            <button
              onClick={handleGenerateDownload}
              disabled={generating}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate Download'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
