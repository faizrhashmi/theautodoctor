/**
 * Bid Comparison Page (Customer View)
 *
 * Compare and select winning bid from workshop submissions
 *
 * @route /customer/rfq/[rfqId]/bids
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'

interface BidData {
  id: string
  created_at: string
  workshop_id: string
  workshop_name: string
  workshop_city?: string
  workshop_rating?: number
  workshop_review_count?: number
  workshop_certifications?: string[]
  workshop_years_in_business?: number
  quote_amount: number
  parts_cost?: number
  labor_cost?: number
  estimated_completion_days?: number
  parts_warranty_months?: number
  labor_warranty_months?: number
  warranty_info?: string
  description: string
  can_provide_loaner_vehicle: boolean
  can_provide_pickup_dropoff: boolean
  status: string
  total_warranty_months: number
}

interface BidsSummary {
  total_bids: number
  pending_bids: number
  lowest_bid: number | null
  highest_bid: number | null
  average_bid: number | null
}

type ViewMode = 'cards' | 'table'
type SortField = 'quote_amount' | 'workshop_rating' | 'total_warranty_months' | 'estimated_completion_days'

export default function BidComparisonPage() {
  const router = useRouter()
  const params = useParams()
  const rfqId = params.rfqId as string

  const [bids, setBids] = useState<BidData[]>([])
  const [summary, setSummary] = useState<BidsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortBy, setSortBy] = useState<SortField>('quote_amount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedBid, setSelectedBid] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    fetchBids()
  }, [rfqId, sortBy, sortOrder])

  async function fetchBids() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('sort_by', sortBy)
      params.append('sort_order', sortOrder)

      const response = await fetch(`/api/rfq/${rfqId}/bids?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch bids')
      }

      const data = await response.json()
      setBids(data.bids || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectBid(bidId: string) {
    setSelectedBid(bidId)
    setShowConfirmDialog(true)
  }

  async function handleConfirmAccept() {
    if (!selectedBid) return

    try {
      // Phase 1.4: Redirect to payment instead of directly accepting
      const response = await fetch(`/api/rfq/${rfqId}/bids/${selectedBid}/payment/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start payment')
      }

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('Failed to create payment session')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start payment')
      setShowConfirmDialog(false)
    }
  }

  const selectedBidData = bids.find(b => b.id === selectedBid)

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/customer/rfq/${rfqId}`}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to RFQ
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">Compare Bids</h1>
            <p className="text-slate-400 mt-2">
              Review and select the best workshop for your repair
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-500">{summary.total_bids}</div>
                <div className="text-sm text-slate-400">Total Bids</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">
                  ${summary.lowest_bid?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-slate-400">Lowest Bid</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">
                  ${summary.average_bid?.toFixed(0) || 'N/A'}
                </div>
                <div className="text-sm text-slate-400">Average Bid</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">
                  ${summary.highest_bid?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-slate-400">Highest Bid</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  aria-label="Card view"
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'table'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  aria-label="Table view"
                >
                  Table
                </button>
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2 items-center">
                <label htmlFor="sort-by" className="text-sm text-slate-400">Sort by:</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="quote_amount">Price</option>
                  <option value="workshop_rating">Rating</option>
                  <option value="total_warranty_months">Warranty</option>
                  <option value="estimated_completion_days">Completion Time</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded"
                  aria-label="Toggle sort order"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
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
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bids.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                No Bids Yet
              </h3>
              <p className="text-slate-500">
                Workshops haven't submitted any bids yet. Check back soon!
              </p>
            </div>
          )}

          {/* Card View */}
          {!loading && !error && bids.length > 0 && viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bids.map(bid => (
                <div
                  key={bid.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-orange-500/50 transition-all"
                >
                  {/* Workshop Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{bid.workshop_name}</h3>
                      <p className="text-sm text-slate-400">{bid.workshop_city}</p>
                      {bid.workshop_rating && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-yellow-500">★</span>
                          <span className="text-white font-semibold">{bid.workshop_rating.toFixed(1)}</span>
                          {bid.workshop_review_count && (
                            <span className="text-sm text-slate-400">({bid.workshop_review_count} reviews)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-400">
                        ${bid.quote_amount.toLocaleString()}
                      </div>
                      {bid.parts_cost && bid.labor_cost && (
                        <div className="text-xs text-slate-400 mt-1">
                          Parts: ${bid.parts_cost} | Labor: ${bid.labor_cost}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 mb-4 line-clamp-3">
                    {bid.description}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {bid.estimated_completion_days && (
                      <div>
                        <span className="text-slate-500">Completion:</span>
                        <p className="text-white">{bid.estimated_completion_days} days</p>
                      </div>
                    )}
                    {bid.total_warranty_months > 0 && (
                      <div>
                        <span className="text-slate-500">Warranty:</span>
                        <p className="text-white">{bid.total_warranty_months} months</p>
                      </div>
                    )}
                  </div>

                  {/* Perks */}
                  {(bid.can_provide_loaner_vehicle || bid.can_provide_pickup_dropoff) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {bid.can_provide_loaner_vehicle && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                          Loaner Vehicle
                        </span>
                      )}
                      {bid.can_provide_pickup_dropoff && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          Pickup/Dropoff
                        </span>
                      )}
                    </div>
                  )}

                  {/* Accept Button */}
                  <button
                    onClick={() => handleSelectBid(bid.id)}
                    disabled={bid.status !== 'pending'}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bid.status === 'accepted' ? 'Selected' : bid.status === 'rejected' ? 'Not Selected' : 'Accept This Bid'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {!loading && !error && bids.length > 0 && viewMode === 'table' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-slate-400 font-semibold">Workshop</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Quote</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Rating</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Completion</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Warranty</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Perks</th>
                    <th className="text-left p-4 text-slate-400 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map(bid => (
                    <tr key={bid.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="p-4">
                        <div className="font-semibold text-white">{bid.workshop_name}</div>
                        <div className="text-sm text-slate-400">{bid.workshop_city}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-lg font-bold text-green-400">
                          ${bid.quote_amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        {bid.workshop_rating ? (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-white">{bid.workshop_rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-white">
                        {bid.estimated_completion_days ? `${bid.estimated_completion_days} days` : 'N/A'}
                      </td>
                      <td className="p-4 text-white">
                        {bid.total_warranty_months > 0 ? `${bid.total_warranty_months} months` : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {bid.can_provide_loaner_vehicle && (
                            <span className="text-blue-400">Loaner</span>
                          )}
                          {bid.can_provide_pickup_dropoff && (
                            <span className="text-green-400">Pickup</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleSelectBid(bid.id)}
                          disabled={bid.status !== 'pending'}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                        >
                          {bid.status === 'accepted' ? 'Selected' : 'Accept'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmDialog && selectedBidData && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-2xl font-bold mb-4">Confirm Bid Acceptance</h2>
                <p className="text-slate-300 mb-6">
                  You're about to accept the bid from <strong className="text-white">{selectedBidData.workshop_name}</strong> for{' '}
                  <strong className="text-green-400">${selectedBidData.quote_amount.toLocaleString()}</strong>.
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  This will notify the workshop and your mechanic will earn a 5% referral fee.
                  All other bids will be automatically rejected.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAccept}
                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
                  >
                    Confirm & Accept
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
