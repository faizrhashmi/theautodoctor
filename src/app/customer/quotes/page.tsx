'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Wrench, Plus, ClipboardList } from 'lucide-react'
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

interface RFQQuote {
  id: string
  title: string
  issue_category: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  budget_min?: number
  budget_max?: number
  bid_count: number
  status: string
  created_at: string
  bid_deadline: string
  hours_remaining: number
  is_expired: boolean
  has_accepted_bid: boolean
}

export default function CustomerQuotesPage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [rfqQuotes, setRfqQuotes] = useState<RFQQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quoteType, setQuoteType] = useState<'repair' | 'rfq'>('repair')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all')
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchAllQuotes()
    }
  }, [user])

  async function fetchAllQuotes() {
    try {
      // Fetch repair quotes
      const repairResponse = await fetch(apiRouteFor.quotes())
      console.log('[QUOTES] Repair quotes response:', repairResponse.status)

      if (repairResponse.ok) {
        const repairData = await repairResponse.json()
        console.log('[QUOTES] Received', repairData.quotes?.length || 0, 'repair quotes')
        setQuotes(repairData.quotes || [])
      }

      // Fetch RFQ quotes
      try {
        const rfqResponse = await fetch('/api/rfq/my-rfqs')
        console.log('[QUOTES] RFQ quotes response:', rfqResponse.status)

        if (rfqResponse.ok) {
          const rfqData = await rfqResponse.json()
          console.log('[QUOTES] Received', rfqData.rfqs?.length || 0, 'RFQ quotes')
          setRfqQuotes(rfqData.rfqs || [])
        }
      } catch (rfqErr) {
        // RFQ feature might not be enabled, just log and continue
        console.log('[QUOTES] RFQ fetch skipped or failed:', rfqErr)
      }
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
      await fetchAllQuotes()
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header with CTA */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Quotes</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Review repair quotes and workshop RFQs</p>
          </div>
          <Link
            href="/customer/rfq/create"
            className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg whitespace-nowrap"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Request Workshop Quotes</span>
            <span className="sm:hidden">New RFQ</span>
          </Link>
        </div>

        {/* Quote Type Tabs */}
        <div className="mb-6 flex items-center gap-3 border-b border-slate-700">
          <button
            onClick={() => setQuoteType('repair')}
            className={`px-4 py-3 text-sm font-semibold transition-all relative ${
              quoteType === 'repair'
                ? 'text-orange-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Repair Quotes</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs">
                {quotes.length}
              </span>
            </div>
            {quoteType === 'repair' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></div>
            )}
          </button>
          <button
            onClick={() => setQuoteType('rfq')}
            className={`px-4 py-3 text-sm font-semibold transition-all relative ${
              quoteType === 'rfq'
                ? 'text-orange-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>RFQ Quotes</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs">
                {rfqQuotes.length}
              </span>
            </div>
            {quoteType === 'rfq' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></div>
            )}
          </button>
        </div>

        {/* Filter Tabs - only for repair quotes */}
        {quoteType === 'repair' && (
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
        )}

        {/* Repair Quotes List */}
        {quoteType === 'repair' && filteredQuotes.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {filteredQuotes.map((quote) => {
              const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
              const isPending = quote.status === 'pending' && !isExpired

              return (
                <div
                  key={quote.id}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700 shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-white break-words">
                            Quote from {quote.provider_name}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            quote.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            quote.status === 'declined' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            isExpired ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {getStatusIcon(isExpired ? 'expired' : quote.status)}
                            {isExpired ? 'expired' : quote.status}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 space-y-1">
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
                    <div className="text-left sm:text-right">
                      <p className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">${quote.total_cost.toFixed(2)}</p>
                      <div className="space-y-0.5 sm:space-y-1 text-xs text-slate-400">
                        <p className="flex items-center sm:justify-end gap-1">
                          <Wrench className="h-3 w-3" />
                          Labor: ${quote.labor_cost.toFixed(2)}
                        </p>
                        <p className="flex items-center sm:justify-end gap-1">
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
                    <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 pt-4 border-t border-slate-700">
                      <button
                        onClick={() => respondToQuote(quote.id, 'accept')}
                        disabled={responding === quote.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        {responding === quote.id ? 'Processing...' : 'Accept Quote'}
                      </button>
                      <button
                        onClick={() => respondToQuote(quote.id, 'decline')}
                        disabled={responding === quote.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700/50 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-slate-700 transition-all border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
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
        )}

        {/* Empty state for repair quotes */}
        {quoteType === 'repair' && filteredQuotes.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No {filter !== 'all' ? filter : ''} repair quotes found</p>
            <p className="text-sm text-slate-500 mb-6">
              {filter === 'all'
                ? "You haven't received any repair quotes yet"
                : `You have no ${filter} repair quotes`
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

        {/* RFQ Quotes List */}
        {quoteType === 'rfq' && rfqQuotes.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {rfqQuotes.map((rfq) => {
              const statusColor = rfq.has_accepted_bid
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : rfq.is_expired
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : rfq.bid_count > 0
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'

              const statusText = rfq.has_accepted_bid
                ? 'Bid Accepted'
                : rfq.is_expired
                ? 'Expired'
                : rfq.bid_count > 0
                ? `${rfq.bid_count} Bids`
                : 'Awaiting Bids'

              return (
                <Link
                  key={rfq.id}
                  href={`/customer/rfq/${rfq.id}/bids`}
                  className="block bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 transition-all"
                >
                  <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700 shrink-0">
                        <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-white break-words">
                            {rfq.title}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-400 space-y-1">
                          <p>
                            <span className="font-medium">Vehicle:</span> {rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}
                          </p>
                          <p>
                            <span className="font-medium">Category:</span> {rfq.issue_category}
                          </p>
                          <p>
                            <span className="font-medium">Created:</span> {new Date(rfq.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          {!rfq.is_expired && rfq.hours_remaining > 0 && (
                            <p className="flex items-center gap-1 text-yellow-400">
                              <Clock className="h-3 w-3" />
                              {rfq.hours_remaining} hours remaining
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {rfq.budget_min && rfq.budget_max && (
                        <>
                          <p className="text-xs sm:text-sm text-slate-400 mb-1">Budget Range</p>
                          <p className="text-lg sm:text-xl font-bold text-white">
                            ${rfq.budget_min} - ${rfq.budget_max}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Empty state for RFQ quotes */}
        {quoteType === 'rfq' && rfqQuotes.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12 text-center">
            <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No workshop RFQs found</p>
            <p className="text-sm text-slate-500 mb-6">
              Request quotes from multiple workshops for your repair needs
            </p>
            <Link
              href="/customer/rfq/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
            >
              <Plus className="h-5 w-5" />
              Create RFQ
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
