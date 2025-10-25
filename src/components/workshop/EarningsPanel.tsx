'use client'

import { useState, useEffect } from 'react'

type Earning = {
  id: string
  session_id: string
  gross_amount_cents: number
  platform_fee_cents: number
  workshop_net_cents: number
  payout_status: 'pending' | 'processing' | 'paid' | 'failed'
  created_at: string
  mechanics?: {
    name: string
  }
  sessions?: {
    type: string
    plan: string
    duration_minutes: number
  }
}

type Summary = {
  total_sessions: number
  total_gross_cents: number
  total_net_cents: number
  paid_out_cents: number
  pending_payout_cents: number
}

export default function EarningsPanel() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')

  useEffect(() => {
    fetchEarnings()
  }, [filter])

  async function fetchEarnings() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }
      params.set('limit', '20')

      const res = await fetch(`/api/workshop/earnings?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch earnings')
      }

      setEarnings(data.earnings || [])
      setSummary(data.summary || null)
    } catch (err) {
      console.error('Error fetching earnings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading && !earnings.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-2 text-gray-400">Loading earnings...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading earnings</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={fetchEarnings}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Total Earned</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {formatCents(summary.total_net_cents)}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {summary.total_sessions} sessions
            </div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="text-sm text-yellow-700">Pending Payout</div>
            <div className="mt-1 text-2xl font-bold text-yellow-900">
              {formatCents(summary.pending_payout_cents)}
            </div>
            <div className="mt-1 text-xs text-yellow-600">Awaiting transfer</div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="text-sm text-green-700">Paid Out</div>
            <div className="mt-1 text-2xl font-bold text-green-900">
              {formatCents(summary.paid_out_cents)}
            </div>
            <div className="mt-1 text-xs text-green-600">Successfully transferred</div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-gray-600">Platform Fees</div>
            <div className="mt-1 text-2xl font-bold text-gray-700">
              {formatCents(summary.total_gross_cents - summary.total_net_cents)}
            </div>
            <div className="mt-1 text-xs text-gray-500">Total paid to platform</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('paid')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'paid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Paid
        </button>
      </div>

      {/* Earnings Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Mechanic
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Gross
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Net
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No earnings found
                  </td>
                </tr>
              ) : (
                earnings.map((earning) => (
                  <tr key={earning.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(earning.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {earning.sessions?.plan || 'N/A'}
                      <div className="text-xs text-gray-400">
                        {earning.sessions?.duration_minutes || 0} min
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {earning.mechanics?.name || 'Unknown'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                      {formatCents(earning.gross_amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-red-600">
                      -{formatCents(earning.platform_fee_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCents(earning.workshop_net_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          earning.payout_status
                        )}`}
                      >
                        {earning.payout_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
