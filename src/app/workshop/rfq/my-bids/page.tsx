/**
 * My Bids Dashboard (Workshop View)
 *
 * Shows all bids submitted by the workshop with status tracking
 *
 * @route /workshop/rfq/my-bids
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'

interface BidWithRfq {
  id: string
  created_at: string
  rfq_marketplace_id: string
  quote_amount: number
  parts_cost?: number
  labor_cost?: number
  description: string
  status: string
  accepted_at?: string
  rejected_at?: string
  estimated_completion_days?: number
  parts_warranty_months?: number
  labor_warranty_months?: number
  workshop_rfq_marketplace: {
    id: string
    title: string
    issue_category: string
    urgency: string
    vehicle_make: string
    vehicle_model: string
    vehicle_year: number
    status: string
    bid_deadline: string
    customer_city?: string
    customer_province?: string
  }
}

export default function MyBidsPage() {
  const [bids, setBids] = useState<BidWithRfq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchBids()
  }, [statusFilter])

  async function fetchBids() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/rfq/bids?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch bids')
      }

      const data = await response.json()
      setBids(data.bids || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const pendingCount = bids.filter(b => b.status === 'pending').length
  const acceptedCount = bids.filter(b => b.status === 'accepted').length
  const rejectedCount = bids.filter(b => b.status === 'rejected').length

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">My Bids</h1>
              <p className="text-slate-400 mt-2">
                Track all your submitted bids and their status
              </p>
            </div>

            <Link
              href="/workshop/rfq/marketplace"
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors focus:ring-2 focus:ring-orange-500"
            >
              Browse RFQs
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-slate-400 mt-1">Pending</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400">{acceptedCount}</div>
              <div className="text-slate-400 mt-1">Accepted</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-red-400">{rejectedCount}</div>
              <div className="text-slate-400 mt-1">Rejected</div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
            <label htmlFor="status-filter" className="block text-sm text-slate-400 mb-2">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 mb-6">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchBids}
                className="mt-4 text-sm text-orange-500 hover:text-orange-400"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bids.length === 0 && (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 text-slate-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                No Bids Found
              </h3>
              <p className="text-slate-500 mb-4">
                You haven't submitted any bids yet
              </p>
              <Link
                href="/workshop/rfq/marketplace"
                className="text-orange-500 hover:text-orange-400 underline"
              >
                Browse RFQ Marketplace →
              </Link>
            </div>
          )}

          {/* Bids List */}
          {!loading && !error && bids.length > 0 && (
            <div className="space-y-4">
              {bids.map(bid => (
                <div
                  key={bid.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/workshop/rfq/marketplace/${bid.rfq_marketplace_id}`}
                        className="text-lg font-semibold text-white hover:text-orange-500 transition-colors"
                      >
                        {bid.workshop_rfq_marketplace.title}
                      </Link>
                      <p className="text-sm text-slate-400 mt-1">
                        {bid.workshop_rfq_marketplace.vehicle_year} {bid.workshop_rfq_marketplace.vehicle_make} {bid.workshop_rfq_marketplace.vehicle_model}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(bid.status)}`}>
                      {bid.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-slate-500">Your Bid:</span>
                      <p className="text-white font-semibold text-lg">
                        ${bid.quote_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="text-white">
                        {bid.workshop_rfq_marketplace.customer_city}, {bid.workshop_rfq_marketplace.customer_province}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Submitted:</span>
                      <p className="text-white">
                        {new Date(bid.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">RFQ Status:</span>
                      <p className="text-white capitalize">
                        {bid.workshop_rfq_marketplace.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {bid.status === 'accepted' && bid.accepted_at && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                      <p className="text-green-400 font-semibold">
                        🎉 Congratulations! Your bid was accepted on {new Date(bid.accepted_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {bid.status === 'rejected' && bid.rejected_at && (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-4">
                      <p className="text-slate-400">
                        Your bid was not selected. Customer chose a different workshop.
                      </p>
                    </div>
                  )}

                  {bid.status === 'pending' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                      <p className="text-yellow-400">
                        Your bid is under review by the customer
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
