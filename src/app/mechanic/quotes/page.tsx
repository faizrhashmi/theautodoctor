'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, Wrench, User } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface Quote {
  id: string
  diagnostic_session_id: string
  customer_name: string
  customer_email: string | null
  customer_concern: string | null
  status: 'pending' | 'accepted' | 'declined'
  total_cost: number
  labor_cost: number
  parts_cost: number
  notes: string | null
  created_at: string
  sent_at: string | null
  customer_responded_at: string | null
}

interface Summary {
  total: number
  pending: number
  accepted: number
  declined: number
}

export default function MechanicQuotesPage() {
  // ✅ Auth guard - ensures user is authenticated as mechanic
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'mechanic' })

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all')

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user, filter])

  async function fetchQuotes() {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter)
      }

      const response = await fetch(`/api/mechanic/quotes?${params.toString()}`)
      console.log('[MECHANIC-QUOTES] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[MECHANIC-QUOTES] Error response:', errorData)
        throw new Error(`Failed to fetch quotes: ${response.status} - ${errorData.error}`)
      }

      const data = await response.json()
      console.log('[MECHANIC-QUOTES] Success, received', data.quotes?.length || 0, 'quotes')
      setQuotes(data.quotes || [])
      setSummary(data.summary || null)
    } catch (err) {
      console.error('[MECHANIC-QUOTES] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'declined':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading quotes...'}
          </p>
        </div>
      </div>
    )
  }

  // Auth guard will redirect if not authenticated, but add safety check
  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">My Quotes</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Track quotes you've sent to customers
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{summary.total}</div>
              <div className="text-sm text-slate-400">Total Quotes</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{summary.pending}</div>
              <div className="text-sm text-slate-400">Pending</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{summary.accepted}</div>
              <div className="text-sm text-slate-400">Accepted</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{summary.declined}</div>
              <div className="text-sm text-slate-400">Declined</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            All Quotes ({summary?.total || 0})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Pending ({summary?.pending || 0})
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'accepted'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Accepted ({summary?.accepted || 0})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'declined'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Declined ({summary?.declined || 0})
          </button>
        </div>

        {/* Quotes List */}
        {filteredQuotes.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Quote for {quote.customer_name}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          {quote.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        {quote.customer_concern && (
                          <p className="text-slate-300">
                            <span className="font-medium">Concern:</span> {quote.customer_concern.substring(0, 100)}
                            {quote.customer_concern.length > 100 ? '...' : ''}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Created:</span> {new Date(quote.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {quote.customer_responded_at && (
                          <p>
                            <span className="font-medium">Responded:</span> {new Date(quote.customer_responded_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white mb-1">${quote.total_cost.toFixed(2)}</p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p className="flex items-center justify-end gap-1">
                        <Wrench className="h-3 w-3" />
                        Labor: ${quote.labor_cost.toFixed(2)}
                      </p>
                      <p className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3" />
                        Parts: ${quote.parts_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {quote.notes && (
                  <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">{quote.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                  <Link
                    href={`/mechanic/session/${quote.diagnostic_session_id}`}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Session →
                  </Link>
                  {quote.status === 'pending' && (
                    <div className="text-xs text-yellow-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Awaiting customer response
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">
              No {filter !== 'all' ? filter : ''} quotes found
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {filter === 'all'
                ? "You haven't created any quotes yet"
                : `You have no ${filter} quotes`
              }
            </p>
            <Link
              href="/mechanic/sessions"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all"
            >
              View Sessions
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
