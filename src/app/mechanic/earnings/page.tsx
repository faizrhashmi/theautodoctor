'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  MessageCircle,
  Video,
  Calendar,
  Download,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'

interface EarningsSummary {
  total_sessions: number
  total_revenue: number
  total_platform_fee: number
  total_earnings: number
  platform_fee_rate: number
}

interface SessionTypeBreakdown {
  count: number
  revenue: number
  earnings: number
}

interface DailyEarnings {
  date: string
  earnings: number
}

interface SessionDetail {
  id: string
  customer_name: string
  session_type: string
  date: string
  revenue: number
  platform_fee: number
  earnings: number
}

interface EarningsData {
  period: string
  date_range: {
    start: string
    end: string
  }
  summary: EarningsSummary
  by_session_type: Record<string, SessionTypeBreakdown>
  daily_earnings: DailyEarnings[]
  session_details: SessionDetail[]
}

export default function MechanicEarningsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month')
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEarnings()
  }, [period])

  const loadEarnings = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/mechanics/earnings?period=${period}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load earnings')
      }

      setEarningsData(data)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!earningsData) return

    // Generate CSV
    const headers = ['Date', 'Customer', 'Session Type', 'Revenue', 'Platform Fee', 'Your Earnings']
    const rows = earningsData.session_details.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.customer_name,
      s.session_type,
      `$${s.revenue.toFixed(2)}`,
      `$${s.platform_fee.toFixed(2)}`,
      `$${s.earnings.toFixed(2)}`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings_${period}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading earnings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Earnings & Reports</h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1">
                Track your income and download reports for tax purposes
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={!earningsData || earningsData.session_details.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Period Filter */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-2 flex flex-wrap gap-2">
          {(['day', 'week', 'month', 'year', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-colors capitalize text-sm sm:text-base ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase()}${p.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {earningsData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-100">Your Earnings</p>
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-3xl font-bold">
                  ${earningsData.summary.total_earnings.toFixed(2)}
                </p>
                <p className="text-sm text-green-100 mt-1">
                  After {MECHANIC_FEES.PLATFORM_FEE_PERCENT}% platform fee
                </p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-400">Total Revenue</p>
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-white">
                  ${earningsData.summary.total_revenue.toFixed(2)}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Before fees
                </p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-400">Total Sessions</p>
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {earningsData.summary.total_sessions}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Completed
                </p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-400">Avg per Session</p>
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-white">
                  ${earningsData.summary.total_sessions > 0
                    ? (earningsData.summary.total_earnings / earningsData.summary.total_sessions).toFixed(2)
                    : '0.00'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Your earnings
                </p>
              </div>
            </div>

            {/* By Session Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                  <h3 className="text-lg font-semibold text-white">Chat Sessions</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Sessions:</span>
                    <span className="font-semibold text-white">
                      {earningsData.by_session_type.chat?.count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Revenue:</span>
                    <span className="font-semibold text-white">
                      ${(earningsData.by_session_type.chat?.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm font-medium text-white">Your Earnings:</span>
                    <span className="font-bold text-green-600">
                      ${(earningsData.by_session_type.chat?.earnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Video className="w-8 h-8 text-purple-600" />
                  <h3 className="text-lg font-semibold text-white">Video Sessions</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Sessions:</span>
                    <span className="font-semibold text-white">
                      {earningsData.by_session_type.video?.count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Revenue:</span>
                    <span className="font-semibold text-white">
                      ${(earningsData.by_session_type.video?.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm font-medium text-white">Your Earnings:</span>
                    <span className="font-bold text-green-600">
                      ${(earningsData.by_session_type.video?.earnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <h3 className="text-lg font-semibold text-white">Upgraded Sessions</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Sessions:</span>
                    <span className="font-semibold text-white">
                      {earningsData.by_session_type.upgraded_from_chat?.count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Revenue:</span>
                    <span className="font-semibold text-white">
                      ${(earningsData.by_session_type.upgraded_from_chat?.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm font-medium text-white">Your Earnings:</span>
                    <span className="font-bold text-green-600">
                      ${(earningsData.by_session_type.upgraded_from_chat?.earnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Details Table */}
            {earningsData.session_details.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Session History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Type</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Revenue</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Platform Fee</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Your Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {earningsData.session_details.map(session => (
                        <tr key={session.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-sm text-white">
                            {new Date(session.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {session.customer_name}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {session.session_type === 'chat' && <MessageCircle className="w-4 h-4 text-blue-600" />}
                              {session.session_type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                              {session.session_type === 'upgraded_from_chat' && <TrendingUp className="w-4 h-4 text-orange-600" />}
                              <span className="text-sm text-white capitalize">
                                {session.session_type.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-white">
                            ${session.revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-400">
                            -${session.platform_fee.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            ${session.earnings.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {earningsData.session_details.length === 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-12 text-center">
                <DollarSign className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Earnings Yet
                </h3>
                <p className="text-slate-400 mb-6">
                  Complete virtual consultations to start earning!
                </p>
                <button
                  onClick={() => router.push('/mechanic/sessions/virtual?filter=pending')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  View Pending Requests
                </button>
              </div>
            )}

            {/* Tax Notice */}
            <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-2">
                    Tax Reporting Information
                  </p>
                  <p className="text-sm text-blue-300">
                    Export your earnings history for tax reporting purposes. The platform fee ({MECHANIC_FEES.PLATFORM_FEE_PERCENT}%) is already
                    deducted from your earnings. Consult with a tax professional for guidance on reporting your
                    income as an independent contractor.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
