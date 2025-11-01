'use client'

import { useState, useEffect } from 'react'

interface DeletionRequest {
  id: string
  customer_id: string
  customer_email: string
  customer_full_name: string
  deletion_reason: string | null
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  scheduled_deletion_date: string | null
  anonymized_at: string | null
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'completed'
  retention_period_days: number
  customer_note: string | null
}

export default function DeletionsPage() {
  const [deletions, setDeletions] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled'>('pending')

  const fetchDeletions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/privacy/deletions')

      if (!response.ok) {
        throw new Error('Failed to fetch deletion requests')
      }

      const data = await response.json()
      setDeletions(data.deletions || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching deletions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deletion requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeletions()
  }, [])

  const filteredDeletions = deletions.filter((deletion) => {
    if (filter === 'pending' && deletion.status !== 'pending') return false
    if (filter === 'scheduled' && deletion.status !== 'scheduled') return false
    return true
  })

  const stats = {
    total: deletions.length,
    pending: deletions.filter((d) => d.status === 'pending').length,
    scheduled: deletions.filter((d) => d.status === 'scheduled').length,
    completed: deletions.filter((d) => d.status === 'completed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading deletion requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Deletion Queue</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchDeletions}
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
          <h1 className="text-3xl font-bold text-white">Account Deletion Queue</h1>
          <p className="text-slate-400 mt-1">PIPEDA Right to Erasure Management</p>
        </div>
        <button
          onClick={fetchDeletions}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon="📋" color="blue" />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon="⏳"
          color={stats.pending > 0 ? 'yellow' : 'gray'}
          alert={stats.pending > 0}
        />
        <StatCard title="Scheduled" value={stats.scheduled} icon="📅" color="orange" />
        <StatCard title="Completed" value={stats.completed} icon="✅" color="green" />
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
            label="Pending Review"
            color="yellow"
          />
          <FilterButton
            active={filter === 'scheduled'}
            onClick={() => setFilter('scheduled')}
            label="Scheduled"
            color="orange"
          />
        </div>
      </div>

      {/* Deletions List */}
      {filteredDeletions.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Deletion Requests</h3>
          <p className="text-slate-400">
            {filter === 'pending' ? 'No pending deletion requests.' : 'No deletion requests found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeletions.map((deletion) => (
            <DeletionCard key={deletion.id} deletion={deletion} onUpdate={fetchDeletions} />
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
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    green: 'border-green-500/30 bg-green-500/10',
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

// Deletion Card Component
function DeletionCard({ deletion, onUpdate }: { deletion: DeletionRequest; onUpdate: () => void }) {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '⏳ Pending Review' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✓ Approved' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '✗ Rejected' },
      scheduled: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '📅 Scheduled' },
      completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '✅ Completed' },
    }

    const badge = badges[status] || badges.pending
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

  const daysUntil = (dateStr: string) => {
    const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const handleApprove = async () => {
    if (!confirm(`Approve deletion request for ${deletion.customer_full_name}?`)) {
      return
    }

    try {
      setApproving(true)
      const response = await fetch(`/api/admin/privacy/deletions/${deletion.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve deletion request')
      }

      alert('Deletion request approved and scheduled')
      onUpdate()
    } catch (err) {
      alert('Error approving deletion: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt(`Reject deletion request for ${deletion.customer_full_name}?\n\nEnter rejection reason:`)
    if (!reason) return

    try {
      setRejecting(true)
      const response = await fetch(`/api/admin/privacy/deletions/${deletion.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject deletion request')
      }

      alert('Deletion request rejected')
      onUpdate()
    } catch (err) {
      alert('Error rejecting deletion: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="mb-2">{getStatusBadge(deletion.status)}</div>
          <h3 className="text-xl font-semibold text-white mb-1">{deletion.customer_full_name}</h3>
          <p className="text-slate-400 text-sm">{deletion.customer_email}</p>
        </div>
        {deletion.status === 'pending' && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {approving ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {rejecting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Requested</div>
          <div className="text-sm text-white">{formatDate(deletion.requested_at)}</div>
          <div className="text-xs text-slate-400">{daysSince(deletion.requested_at)} days ago</div>
        </div>

        {deletion.scheduled_deletion_date && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Scheduled Deletion</div>
            <div className="text-sm text-white">{formatDate(deletion.scheduled_deletion_date)}</div>
            <div className="text-xs text-slate-400">
              {daysUntil(deletion.scheduled_deletion_date) > 0
                ? `In ${daysUntil(deletion.scheduled_deletion_date)} days`
                : 'Overdue'}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-slate-500 mb-1">Retention Period</div>
          <div className="text-sm text-white">{deletion.retention_period_days} days</div>
        </div>
      </div>

      {deletion.deletion_reason && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Customer's Reason</div>
          <p className="text-sm text-slate-300">{deletion.deletion_reason}</p>
        </div>
      )}

      {deletion.customer_note && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Additional Notes</div>
          <p className="text-sm text-slate-300">{deletion.customer_note}</p>
        </div>
      )}

      {deletion.status === 'rejected' && deletion.rejection_reason && (
        <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
          <div className="text-xs text-red-500 mb-1">Rejection Reason</div>
          <p className="text-sm text-red-300">{deletion.rejection_reason}</p>
          <div className="text-xs text-slate-400 mt-2">
            Rejected on {formatDate(deletion.rejected_at)}
          </div>
        </div>
      )}

      {deletion.status === 'completed' && (
        <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <span>✅</span>
            <span className="font-semibold">Account Anonymized</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Completed on {formatDate(deletion.anonymized_at)}
          </div>
        </div>
      )}

      {deletion.status === 'pending' && daysSince(deletion.requested_at) > 7 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold">
            <span>⚠️</span>
            <span>Action Required: Request pending for {daysSince(deletion.requested_at)} days</span>
          </div>
          <p className="text-sm text-yellow-300 mt-1">
            PIPEDA requires timely response to deletion requests. Please review and take action.
          </p>
        </div>
      )}
    </div>
  )
}
