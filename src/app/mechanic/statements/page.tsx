'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowLeft,
  Loader2,
  Calendar
} from 'lucide-react'

interface StatementData {
  period: { year: number; month: number | null }
  summary: {
    totalRevenue: number
    totalEarnings: number
    netEarnings: number
    totalJobs: number
  }
  virtualWork: {
    jobs: number
    revenue: number
    earnings: number
  }
  physicalWork: {
    jobs: number
    revenue: number
    earnings: number
  }
  expenses: {
    platformFees: number
    workshopFees: number
    bayRentalCosts: number
    membershipFees: number
    total: number
  }
}

export default function MechanicStatementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [statement, setStatement] = useState<StatementData | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1)
  const [error, setError] = useState<string | null>(null)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  // ✅ Auth guard - Check mechanic authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth check
    fetchStatement()
  }, [selectedYear, selectedMonth, isAuthenticated])

  const fetchStatement = async () => {
    try {
      setLoading(true)
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : ''
      const response = await fetch(`/api/mechanics/statements?year=${selectedYear}${monthParam}`)

      if (!response.ok) {
        throw new Error('Failed to fetch statement')
      }

      const data = await response.json()
      setStatement(data)
    } catch (err) {
      console.error('Statement error:', err)
      setError('Failed to load statement data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading statement...</p>
        </div>
      </div>
    )
  }

  if (error || !statement) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>{error || 'No statement data available'}</p>
        </div>
      </div>
    )
  }

  const periodText = selectedMonth
    ? `${months[selectedMonth - 1]} ${selectedYear}`
    : `Full Year ${selectedYear}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/mechanic/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-orange-500" />
                Earnings Statements
              </h1>
              <p className="text-slate-400 mt-1">Detailed breakdown of your earnings and expenses</p>
            </div>

            {/* Period Selectors */}
            <div className="flex gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
              >
                <option value="">Full Year</option>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Period Title */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5" />
                <h2 className="text-2xl font-bold">{periodText}</h2>
              </div>
              <p className="text-white/80">Statement Summary</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <div className="text-sm text-slate-400">Total Revenue</div>
            </div>
            <div className="text-3xl font-bold text-white">${statement.summary.totalRevenue.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div className="text-sm text-slate-400">Gross Earnings</div>
            </div>
            <div className="text-3xl font-bold text-white">${statement.summary.totalEarnings.toFixed(2)}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <div className="text-sm text-slate-400">Total Expenses</div>
            </div>
            <div className="text-3xl font-bold text-white">${statement.expenses.total.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-sm rounded-lg border border-orange-500/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              <div className="text-sm text-orange-300">Net Earnings</div>
            </div>
            <div className="text-3xl font-bold text-white">${statement.summary.netEarnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Virtual Work */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Virtual Diagnostic Sessions</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Sessions Completed</span>
                <span className="text-white font-bold">{statement.virtualWork.jobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Revenue</span>
                <span className="text-green-400 font-bold">${statement.virtualWork.revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-300">Your Earnings (85%)</span>
                <span className="text-orange-400 font-bold">${statement.virtualWork.earnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Physical Work */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Physical Jobs (Workshop Partnership)</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Jobs Completed</span>
                <span className="text-white font-bold">{statement.physicalWork.jobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Revenue</span>
                <span className="text-green-400 font-bold">${statement.physicalWork.revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-300">Your Share</span>
                <span className="text-orange-400 font-bold">${statement.physicalWork.earnings.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Expenses Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="text-slate-300">Platform Fees (15% on virtual)</span>
              <span className="text-red-400">-${statement.expenses.platformFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-300">Workshop Revenue Share</span>
              <span className="text-red-400">-${statement.expenses.workshopFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-300">Bay Rental Costs</span>
              <span className="text-red-400">-${statement.expenses.bayRentalCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-300">Membership Fees</span>
              <span className="text-red-400">-${statement.expenses.membershipFees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3 text-lg font-bold">
              <span className="text-white">Total Expenses</span>
              <span className="text-red-400">-${statement.expenses.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
