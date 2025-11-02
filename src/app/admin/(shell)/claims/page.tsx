// @ts-nocheck
'use client'

/**
 * Admin Claims Management Page
 * Handle customer satisfaction claims and refunds
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Search,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar
} from 'lucide-react'

interface Claim {
  id: string
  session_id: string
  customer_user_id: string
  reason: string
  status: 'open' | 'approved' | 'rejected' | 'refunded'
  created_at: string
  resolved_at: string | null
  admin_notes: string | null
  sessions: {
    id: string
    plan: string
    type: string
    created_at: string
  } | null
  refunds: Array<{
    id: string
    amount_cents: number
    status: string
  }> | null
}

type StatusFilter = 'all' | 'open' | 'approved' | 'rejected' | 'refunded'

export default function ClaimsPage() {
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<Claim[]>([])
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/admin/claims?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch claims')

      const data = await response.json()
      setClaims(data.claims || [])
    } catch (error: unknown) {
      console.error('Error fetching claims:', error)
      alert('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  // Apply search filter
  useEffect(() => {
    let filtered = claims

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (claim) =>
          claim.id.toLowerCase().includes(query) ||
          claim.reason.toLowerCase().includes(query) ||
          claim.session_id.toLowerCase().includes(query)
      )
    }

    setFilteredClaims(filtered)
  }, [claims, searchQuery])

  const handleApproveClaim = async (claimId: string) => {
    const notes = prompt('Enter approval notes (optional):')
    if (notes === null) return // User cancelled

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) throw new Error('Failed to approve claim')

      alert('Claim approved successfully')
      setSelectedClaim(null)
      await fetchClaims()
    } catch (error: unknown) {
      console.error('Error approving claim:', error)
      alert(error.message || 'Failed to approve claim')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectClaim = async (claimId: string) => {
    const reason = prompt('Enter rejection reason (required):')
    if (!reason) {
      alert('Rejection reason is required')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) throw new Error('Failed to reject claim')

      alert('Claim rejected successfully')
      setSelectedClaim(null)
      await fetchClaims()
    } catch (error: unknown) {
      console.error('Error rejecting claim:', error)
      alert(error.message || 'Failed to reject claim')
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate stats
  const stats = {
    total: claims.length,
    open: claims.filter((c) => c.status === 'open').length,
    approved: claims.filter((c) => c.status === 'approved').length,
    rejected: claims.filter((c) => c.status === 'rejected').length,
    refunded: claims.filter((c) => c.status === 'refunded').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-slate-400">Loading claims...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Claims Management</h1>
        <p className="mt-1 text-sm text-slate-400">
          Handle customer satisfaction claims and refund requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Claims"
          value={stats.total}
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          label="Open"
          value={stats.open}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          bgColor="bg-yellow-50"
          badge={stats.open > 0}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          bgColor="bg-red-50"
        />
        <StatCard
          label="Refunded"
          value={stats.refunded}
          icon={<DollarSign className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by claim ID, session ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchClaims}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No claims found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Claims will appear here when customers file them'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredClaims.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                onSelect={() => setSelectedClaim(claim)}
                onApprove={handleApproveClaim}
                onReject={handleRejectClaim}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onApprove={handleApproveClaim}
          onReject={handleRejectClaim}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}

// Helper Components
interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  bgColor: string
  badge?: boolean
}

function StatCard({ label, value, icon, bgColor, badge }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${bgColor} rounded-lg`}>{icon}</div>
        {badge && (
          <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded">
            ACTION NEEDED
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

interface ClaimRowProps {
  claim: Claim
  onSelect: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  actionLoading: boolean
}

function ClaimRow({ claim, onSelect, onApprove, onReject, actionLoading }: ClaimRowProps) {
  const getStatusBadge = () => {
    switch (claim.status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
            <Clock className="h-3 w-3" />
            Open
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        )
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
            <DollarSign className="h-3 w-3" />
            Refunded
          </span>
        )
    }
  }

  return (
    <div className="p-4 hover:bg-slate-900/50 transition">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Claim Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white">Claim #{claim.id.slice(0, 8)}</h3>
            {getStatusBadge()}
          </div>

          <p className="text-sm text-slate-200 mb-2 line-clamp-2">{claim.reason}</p>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Session: {claim.session_id.slice(0, 8)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(claim.created_at).toLocaleDateString('en-CA')}
            </div>
          </div>

          {claim.refunds && claim.refunds.length > 0 && (
            <div className="mt-2 text-xs text-purple-700 bg-purple-50 inline-block px-2 py-1 rounded">
              Refund: ${(claim.refunds[0].amount_cents / 100).toFixed(2)} (
              {claim.refunds[0].status})
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSelect}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>

          {claim.status === 'open' && (
            <>
              <button
                onClick={() => onApprove(claim.id)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-1"
              >
                <ThumbsUp className="h-3 w-3" />
                Approve
              </button>
              <button
                onClick={() => onReject(claim.id)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1"
              >
                <ThumbsDown className="h-3 w-3" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ClaimDetailModalProps {
  claim: Claim
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  actionLoading: boolean
}

function ClaimDetailModal({
  claim,
  onClose,
  onApprove,
  onReject,
  actionLoading
}: ClaimDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-white">Claim Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-slate-400 hover:bg-slate-800/50 rounded-lg transition"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <h3 className="font-semibold text-white mb-2">Status</h3>
            <div className="inline-block">
              {claim.status === 'open' && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded">
                  Open - Awaiting Review
                </span>
              )}
              {claim.status === 'approved' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                  Approved
                </span>
              )}
              {claim.status === 'rejected' && (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
                  Rejected
                </span>
              )}
              {claim.status === 'refunded' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded">
                  Refunded
                </span>
              )}
            </div>
          </div>

          {/* Claim Details */}
          <div>
            <h3 className="font-semibold text-white mb-3">Claim Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailField label="Claim ID" value={claim.id} />
              <DetailField label="Session ID" value={claim.session_id} />
              <DetailField label="Customer ID" value={claim.customer_user_id} />
              <DetailField
                label="Submitted"
                value={new Date(claim.created_at).toLocaleString('en-CA')}
              />
              {claim.resolved_at && (
                <DetailField
                  label="Resolved"
                  value={new Date(claim.resolved_at).toLocaleString('en-CA')}
                />
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="font-semibold text-white mb-2">Customer Reason</h3>
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <p className="text-sm text-slate-200">{claim.reason}</p>
            </div>
          </div>

          {/* Session Info */}
          {claim.sessions && (
            <div>
              <h3 className="font-semibold text-white mb-3">Session Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailField label="Plan" value={claim.sessions.plan} />
                <DetailField label="Type" value={claim.sessions.type} />
                <DetailField
                  label="Session Date"
                  value={new Date(claim.sessions.created_at).toLocaleString('en-CA')}
                />
              </div>
            </div>
          )}

          {/* Refund Info */}
          {claim.refunds && claim.refunds.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-3">Refund Information</h3>
              {claim.refunds.map((refund) => (
                <div key={refund.id} className="bg-purple-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailField
                      label="Amount"
                      value={`$${(refund.amount_cents / 100).toFixed(2)}`}
                    />
                    <DetailField label="Status" value={refund.status} />
                    <DetailField label="Refund ID" value={refund.id} fullWidth />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Notes */}
          {claim.admin_notes && (
            <div>
              <h3 className="font-semibold text-white mb-2">Admin Notes</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-200">{claim.admin_notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {claim.status === 'open' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-200 bg-slate-800/50 backdrop-blur-sm border rounded-lg hover:bg-slate-900/50 transition"
            >
              Close
            </button>
            <button
              onClick={() => onReject(claim.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Reject Claim
            </button>
            <button
              onClick={() => onApprove(claim.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Claim
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface DetailFieldProps {
  label: string
  value: string
  fullWidth?: boolean
}

function DetailField({ label, value, fullWidth }: DetailFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  )
}
