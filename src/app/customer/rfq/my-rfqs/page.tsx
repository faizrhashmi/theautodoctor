/**
 * Customer RFQ Dashboard
 *
 * Lists all RFQs created by the customer with status tracking
 *
 * @route /customer/rfq/my-rfqs
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'

interface RfqListing {
  id: string
  title: string
  issue_category: string
  urgency: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  budget_min?: number
  budget_max?: number
  bid_deadline: string
  max_bids: number
  bid_count: number
  status: string
  created_at: string
  hours_remaining: number
  is_expired: boolean
  bids_remaining: number
  has_accepted_bid: boolean
}

interface Summary {
  total_rfqs: number
  open_rfqs: number
  awaiting_selection: number
  accepted_rfqs: number
  expired_rfqs: number
}

export default function MyRfqsPage() {
  const [rfqs, setRfqs] = useState<RfqListing[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchRfqs()
  }, [statusFilter])

  async function fetchRfqs() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/rfq/my-rfqs?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch RFQs')
      }

      const data = await response.json()
      setRfqs(data.rfqs || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFQs')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (rfq: RfqListing) => {
    if (rfq.has_accepted_bid) {
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    if (rfq.is_expired) {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    if (rfq.status === 'open' && rfq.bid_count > 0) {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
    if (rfq.status === 'open') {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  const getStatusText = (rfq: RfqListing) => {
    if (rfq.has_accepted_bid) return 'Bid Accepted'
    if (rfq.is_expired) return 'Expired'
    if (rfq.status === 'open' && rfq.bid_count > 0) return 'Review Bids'
    if (rfq.status === 'open') return 'Awaiting Bids'
    return rfq.status.replace('_', ' ')
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold">My RFQs</h1>
            <p className="text-slate-400 mt-2">
              Track your repair requests and workshop bids
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{summary.total_rfqs}</div>
                <div className="text-sm text-slate-400">Total RFQs</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{summary.open_rfqs}</div>
                <div className="text-sm text-slate-400">Open</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{summary.awaiting_selection}</div>
                <div className="text-sm text-slate-400">Awaiting Selection</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{summary.accepted_rfqs}</div>
                <div className="text-sm text-slate-400">Accepted</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">{summary.expired_rfqs}</div>
                <div className="text-sm text-slate-400">Expired</div>
              </div>
            </div>
          )}

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
              <option value="open">Open</option>
              <option value="bid_accepted">Bid Accepted</option>
              <option value="expired">Expired</option>
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
                onClick={fetchRfqs}
                className="mt-4 text-sm text-orange-500 hover:text-orange-400"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && rfqs.length === 0 && (
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
                No RFQs Found
              </h3>
              <p className="text-slate-500">
                You haven't created any RFQs yet
              </p>
            </div>
          )}

          {/* RFQ List */}
          {!loading && !error && rfqs.length > 0 && (
            <div className="space-y-4">
              {rfqs.map(rfq => (
                <div
                  key={rfq.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/customer/rfq/${rfq.id}`}
                        className="text-lg font-semibold text-white hover:text-orange-500 transition-colors"
                      >
                        {rfq.title}
                      </Link>
                      <p className="text-sm text-slate-400 mt-1">
                        {rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(rfq)}`}>
                      {getStatusText(rfq)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-slate-500">Bids Received:</span>
                      <p className="text-white font-semibold">
                        {rfq.bid_count} / {rfq.max_bids}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Created:</span>
                      <p className="text-white">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {rfq.status === 'open' && rfq.hours_remaining > 0 && (
                      <div>
                        <span className="text-slate-500">Time Remaining:</span>
                        <p className={rfq.hours_remaining <= 24 ? 'text-orange-500 font-semibold' : 'text-white'}>
                          {rfq.hours_remaining}h
                        </p>
                      </div>
                    )}
                    {(rfq.budget_min || rfq.budget_max) && (
                      <div>
                        <span className="text-slate-500">Budget:</span>
                        <p className="text-white">
                          ${rfq.budget_min || 0} - ${rfq.budget_max || 'Any'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {rfq.status === 'open' && rfq.bid_count > 0 && (
                    <Link
                      href={`/customer/rfq/${rfq.id}/bids`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Compare {rfq.bid_count} Bid{rfq.bid_count !== 1 ? 's' : ''}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}

                  {rfq.has_accepted_bid && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
                      <p className="text-green-400 text-sm">
                        ✓ You've accepted a bid. The workshop will contact you soon.
                      </p>
                    </div>
                  )}

                  {rfq.is_expired && (
                    <div className="bg-slate-800 rounded-lg p-3 mt-4">
                      <p className="text-slate-400 text-sm">
                        This RFQ has expired. Consider creating a new one if you still need service.
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
