/**
 * RFQ Marketplace Analytics Dashboard (Admin Only)
 *
 * Displays comprehensive RFQ marketplace performance metrics
 *
 * @route /admin/rfq-analytics
 */

'use client'

import { useState, useEffect } from 'react'
import { RfqGate } from '@/components/guards/FeatureGate'

interface RfqMetrics {
  total_rfqs: number
  open: number
  accepted: number
  expired: number
  conversion_rate: number
  avg_bids_per_rfq: number
  avg_time_to_acceptance_hours: number
}

interface BidMetrics {
  total_bids: number
  accepted: number
  rejected: number
  pending: number
  acceptance_rate: number
  avg_bid_amount: number
}

interface WorkshopMetrics {
  unique_workshops_viewing: number
  workshops_with_bids: number
  workshop_conversion_rate: number
}

interface AnalyticsData {
  rfq_metrics: RfqMetrics
  bid_metrics: BidMetrics
  workshop_metrics: WorkshopMetrics
  daily_trends: Array<{
    date: string
    rfqs_created: number
    bids_received: number
  }>
}

export default function RfqAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/rfq-analytics?time_range=${timeRange}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">RFQ Marketplace Analytics</h1>
              <p className="text-slate-400 mt-2">Performance metrics and insights</p>
            </div>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
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
                onClick={fetchAnalytics}
                className="mt-4 text-sm text-orange-500 hover:text-orange-400"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Analytics Data */}
          {!loading && !error && data && (
            <>
              {/* RFQ Metrics */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">RFQ Performance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-white">{data.rfq_metrics.total_rfqs}</div>
                    <div className="text-sm text-slate-400">Total RFQs</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400">{data.rfq_metrics.conversion_rate}%</div>
                    <div className="text-sm text-slate-400">Conversion Rate</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-400">{data.rfq_metrics.avg_bids_per_rfq}</div>
                    <div className="text-sm text-slate-400">Avg Bids/RFQ</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-orange-400">{data.rfq_metrics.avg_time_to_acceptance_hours.toFixed(1)}h</div>
                    <div className="text-sm text-slate-400">Avg Time to Accept</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">{data.rfq_metrics.open}</div>
                    <div className="text-sm text-slate-400">Open</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{data.rfq_metrics.accepted}</div>
                    <div className="text-sm text-slate-400">Accepted</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">{data.rfq_metrics.expired}</div>
                    <div className="text-sm text-slate-400">Expired</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">{data.rfq_metrics.bidding_rate}%</div>
                    <div className="text-sm text-slate-400">Bidding Rate</div>
                  </div>
                </div>
              </div>

              {/* Bid Metrics */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Bid Performance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-white">{data.bid_metrics.total_bids}</div>
                    <div className="text-sm text-slate-400">Total Bids</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400">{data.bid_metrics.acceptance_rate}%</div>
                    <div className="text-sm text-slate-400">Acceptance Rate</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-orange-400">${data.bid_metrics.avg_bid_amount.toFixed(0)}</div>
                    <div className="text-sm text-slate-400">Avg Bid Amount</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{data.bid_metrics.accepted}</div>
                    <div className="text-sm text-slate-400">Accepted</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">{data.bid_metrics.rejected}</div>
                    <div className="text-sm text-slate-400">Rejected</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">{data.bid_metrics.pending}</div>
                    <div className="text-sm text-slate-400">Pending</div>
                  </div>
                </div>
              </div>

              {/* Workshop Metrics */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Workshop Engagement</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-white">{data.workshop_metrics.unique_workshops_viewing}</div>
                    <div className="text-sm text-slate-400">Workshops Viewing</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-400">{data.workshop_metrics.workshops_with_bids}</div>
                    <div className="text-sm text-slate-400">Workshops Bidding</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400">{data.workshop_metrics.workshop_conversion_rate}%</div>
                    <div className="text-sm text-slate-400">Workshop Conversion</div>
                  </div>
                </div>
              </div>

              {/* Daily Trends Table */}
              <div>
                <h2 className="text-xl font-bold mb-4">Daily Trends</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left p-4 text-slate-400 font-semibold">Date</th>
                        <th className="text-left p-4 text-slate-400 font-semibold">RFQs Created</th>
                        <th className="text-left p-4 text-slate-400 font-semibold">Bids Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_trends.slice(-14).reverse().map(trend => (
                        <tr key={trend.date} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-4 text-white">
                            {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-4 text-white font-semibold">{trend.rfqs_created}</td>
                          <td className="p-4 text-white font-semibold">{trend.bids_received}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kill-Switch Status */}
              <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Feature Flag Status</h3>
                <p className="text-blue-200">
                  RFQ Marketplace is currently: <strong className="text-green-400">ENABLED</strong>
                </p>
                <p className="text-sm text-blue-300 mt-2">
                  To disable: Set <code className="bg-slate-800 px-2 py-1 rounded">ENABLE_WORKSHOP_RFQ=false</code> in environment variables and redeploy.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
