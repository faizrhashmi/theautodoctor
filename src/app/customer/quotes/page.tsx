'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Wrench } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { apiRouteFor } from '@/lib/routes'

interface Quote {
  id: string
  diagnostic_session_id: string
  provider_name: string
  provider_type: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  total_cost: number
  labor_cost: number
  parts_cost: number
  notes: string | null
  created_at: string
  valid_until: string | null
  customer_response_at: string | null
}

export default function CustomerQuotesPage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all')
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user])

  async function fetchQuotes() {
    try {
      const response = await fetch(apiRouteFor.quotes())
      console.log('[QUOTES] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[QUOTES] Error response:', errorData)
        throw new Error(`Failed to fetch quotes: ${response.status} - ${errorData.error}`)
      }

      const data = await response.json()
      console.log('[QUOTES] Success, received', data.quotes?.length || 0, 'quotes')
      setQuotes(data.quotes || [])
    } catch (err) {
      console.error('[QUOTES] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  async function respondToQuote(quoteId: string, action: 'accept' | 'decline') {
    setResponding(quoteId)
    try {
      const response = await fetch(apiRouteFor.quoteRespond(quoteId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error('Failed to respond to quote')
      }

      // Refresh quotes
      await fetchQuotes()
    } catch (err) {
      console.error('Response error:', err)
      alert('Failed to respond to quote. Please try again.')
    } finally {
      setResponding(null)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    if (filter === 'all') return true
    return quote.status === filter
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'expired':
        return <Clock className="h-4 w-4 text-slate-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
    }
  }

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">My Quotes</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Review and respond to repair quotes from mechanics</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            All Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Pending ({quotes.filter(q => q.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'accepted'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Accepted ({quotes.filter(q => q.status === 'accepted').length})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'declined'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            Declined ({quotes.filter(q => q.status === 'declined').length})
          </button>
        </div>

        {/* Quotes List */}
        {filteredQuotes.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {filteredQuotes.map((quote) => {
              const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
              const isPending = quote.status === 'pending' && !isExpired

              return (
                <div
                  key={quote.id}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700">
                        <FileText className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            Quote from {quote.provider_name}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            quote.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            quote.status === 'declined' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            isExpired ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {getStatusIcon(isExpired ? 'expired' : quote.status)}
                            {isExpired ? 'expired' : quote.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400">
                          <p className="capitalize">{quote.provider_type}</p>
                          <p>Created: {new Date(quote.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                          {quote.valid_until && (
                            <p className={isExpired ? 'text-red-400' : ''}>
                              Valid until: {new Date(quote.valid_until).toLocaleString('en-US', {
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

                  {isPending && (
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                      <button
                        onClick={() => respondToQuote(quote.id, 'accept')}
                        disabled={responding === quote.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="h-5 w-5" />
                        {responding === quote.id ? 'Processing...' : 'Accept Quote'}
                      </button>
                      <button
                        onClick={() => respondToQuote(quote.id, 'decline')}
                        disabled={responding === quote.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-5 w-5" />
                        Decline
                      </button>
                    </div>
                  )}

                  {quote.customer_response_at && (
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-500">
                        Responded: {new Date(quote.customer_response_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No {filter !== 'all' ? filter : ''} quotes found</p>
            <p className="text-sm text-slate-500 mb-6">
              {filter === 'all'
                ? "You haven't received any repair quotes yet"
                : `You have no ${filter} quotes`
              }
            </p>
            <Link
              href="/intake?plan=free"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
            >
              Start a Diagnostic Session
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
