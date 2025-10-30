'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Wrench,
  Calendar,
  ArrowLeft,
  Loader2
} from 'lucide-react'

interface AnalyticsData {
  period: string
  totalJobs: number
  totalRevenue: number
  totalEarnings: number
  avgRevenuePerJob: number
  virtualJobs: {
    count: number
    revenue: number
    earnings: number
  }
  physicalJobs: {
    count: number
    revenue: number
    earnings: number
  }
  sessionTypes: {
    chat: { count: number; revenue: number }
    video: { count: number; revenue: number }
  }
  dailyData: Array<{
    date: string
    jobs: number
    revenue: number
    earnings: number
  }>
}

export default function MechanicAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mechanics/analytics?period=${period}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('Analytics error:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>{error || 'No analytics data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/mechanic/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-6 sm:w-8 h-6 sm:h-8 text-orange-500" />
                Analytics & Insights
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1">Track your performance and earnings</p>
            </div>

            {/* Period Selector */}
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    period === p
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-5 h-5 text-blue-500" />
              <div className="text-sm text-slate-400">Total Jobs</div>
            </div>
            <div className="text-3xl font-bold text-white">{analytics.totalJobs}</div>
            <div className="text-xs text-slate-500 mt-1">
              Virtual: {analytics.virtualJobs.count} | Physical: {analytics.physicalJobs.count}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-sm text-slate-400">Total Revenue</div>
            </div>
            <div className="text-3xl font-bold text-white">${analytics.totalRevenue.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Across all job types
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div className="text-sm text-slate-400">Total Earnings</div>
            </div>
            <div className="text-3xl font-bold text-white">${analytics.totalEarnings.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Your share after platform fees
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div className="text-sm text-slate-400">Avg per Job</div>
            </div>
            <div className="text-3xl font-bold text-white">${analytics.avgRevenuePerJob.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Average revenue per job
            </div>
          </div>
        </div>

        {/* Job Type Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Virtual Jobs */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Virtual Diagnostics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Jobs Completed</span>
                <span className="text-white font-bold">{analytics.virtualJobs.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Total Revenue</span>
                <span className="text-green-400 font-bold">${analytics.virtualJobs.revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Your Earnings (85%)</span>
                <span className="text-orange-400 font-bold">${analytics.virtualJobs.earnings.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-sm">Chat Sessions</span>
                  <span className="text-slate-300 text-sm">{analytics.sessionTypes.chat.count} ($
{analytics.sessionTypes.chat.revenue.toFixed(2)})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Video Sessions</span>
                  <span className="text-slate-300 text-sm">{analytics.sessionTypes.video.count} (${analytics.sessionTypes.video.revenue.toFixed(2)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Physical Jobs */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-500" />
              Physical Jobs (Workshop Partnership)
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Jobs Completed</span>
                <span className="text-white font-bold">{analytics.physicalJobs.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Total Revenue</span>
                <span className="text-green-400 font-bold">${analytics.physicalJobs.revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Your Share</span>
                <span className="text-orange-400 font-bold">${analytics.physicalJobs.earnings.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  Physical jobs are completed at partner workshops. Your share varies based on workshop agreements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Performance */}
        {analytics.dailyData && analytics.dailyData.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Daily Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Jobs</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Revenue</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.dailyData.map((day) => (
                    <tr key={day.date} className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-white">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{day.jobs}</td>
                      <td className="py-3 px-4 text-right text-green-400">${day.revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-400">${day.earnings.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
