/**
 * RFQ Marketplace Browse Page (Workshop View)
 *
 * Allows workshops to browse and filter open RFQs to bid on
 *
 * @route /workshop/rfq/marketplace
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'
import { SERVICE_CATEGORIES, URGENCY_LEVELS } from '@/lib/rfq/validation'

interface RfqListing {
  id: string
  title: string
  description: string
  issue_category: string
  urgency: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_mileage: number
  budget_min?: number
  budget_max?: number
  bid_deadline: string
  max_bids: number
  bid_count: number
  customer_city?: string
  customer_province?: string
  hours_remaining: number
  is_expiring_soon: boolean
  bids_remaining: number
  can_bid: boolean
  created_at: string
}

interface Filters {
  category: string
  urgency: string
  min_budget: string
  max_budget: string
  hide_already_bid: boolean
}

export default function RfqMarketplacePage() {
  const router = useRouter()
  const [rfqs, setRfqs] = useState<RfqListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    category: '',
    urgency: '',
    min_budget: '',
    max_budget: '',
    hide_already_bid: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchRfqs()
  }, [filters])

  async function fetchRfqs() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.urgency) params.append('urgency', filters.urgency)
      if (filters.min_budget) params.append('min_budget', filters.min_budget)
      if (filters.max_budget) params.append('max_budget', filters.max_budget)
      if (filters.hide_already_bid) params.append('hide_already_bid', 'true')

      const response = await fetch(`/api/rfq/marketplace?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch RFQs')
      }

      const data = await response.json()
      setRfqs(data.rfqs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFQs')
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      urgency: '',
      min_budget: '',
      max_budget: '',
      hide_already_bid: false,
    })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== false)

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">RFQ Marketplace</h1>
              <p className="text-slate-400 mt-2">
                Browse open repair requests and submit competitive bids
              </p>
            </div>

            <Link
              href="/workshop/rfq/my-bids"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors focus:ring-2 focus:ring-slate-500"
            >
              My Bids
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-orange-500 hover:text-orange-400"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-slate-400 hover:text-white sm:hidden"
                >
                  {showFilters ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm text-slate-400 mb-2">
                  Service Type
                </label>
                <select
                  id="category-filter"
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Categories</option>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Urgency Filter */}
              <div>
                <label htmlFor="urgency-filter" className="block text-sm text-slate-400 mb-2">
                  Urgency
                </label>
                <select
                  id="urgency-filter"
                  value={filters.urgency}
                  onChange={(e) => updateFilter('urgency', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Urgencies</option>
                  {URGENCY_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Budget Filter */}
              <div>
                <label htmlFor="max-budget-filter" className="block text-sm text-slate-400 mb-2">
                  Max Budget
                </label>
                <input
                  id="max-budget-filter"
                  type="number"
                  placeholder="Any"
                  value={filters.max_budget}
                  onChange={(e) => updateFilter('max_budget', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Hide Already Bid */}
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hide_already_bid}
                    onChange={(e) => updateFilter('hide_already_bid', e.target.checked)}
                    className="w-5 h-5 bg-slate-800 border-2 border-slate-700 rounded checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <span className="ml-2 text-sm text-slate-300">
                    Hide already bid
                  </span>
                </label>
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
              <p className="text-slate-500 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results'
                  : 'There are no open RFQs at the moment. Check back later!'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-orange-500 hover:text-orange-400"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* RFQ List */}
          {!loading && !error && rfqs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rfqs.map(rfq => (
                <Link
                  key={rfq.id}
                  href={`/workshop/rfq/marketplace/${rfq.id}`}
                  className="block bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-orange-500/50 transition-all hover:shadow-lg group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors line-clamp-2">
                        {rfq.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(rfq.urgency)}`}
                    >
                      {rfq.urgency}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 line-clamp-2 mb-4">
                    {rfq.description}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="text-white font-medium">
                        {rfq.customer_city}, {rfq.customer_province}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Mileage:</span>
                      <p className="text-white font-medium">
                        {rfq.vehicle_mileage.toLocaleString()} km
                      </p>
                    </div>
                    {(rfq.budget_min || rfq.budget_max) && (
                      <div>
                        <span className="text-slate-500">Budget:</span>
                        <p className="text-white font-medium">
                          ${rfq.budget_min || 0} - ${rfq.budget_max || 'Any'}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">Bids:</span>
                      <p className="text-white font-medium">
                        {rfq.bid_count} / {rfq.max_bids}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-5 h-5 ${rfq.is_expiring_soon ? 'text-orange-500' : 'text-slate-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className={`text-sm ${rfq.is_expiring_soon ? 'text-orange-500 font-semibold' : 'text-slate-400'}`}>
                        {rfq.hours_remaining}h remaining
                      </span>
                    </div>

                    <span className="text-sm text-orange-500 group-hover:underline flex items-center gap-1">
                      View Details
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Results Summary */}
          {!loading && !error && rfqs.length > 0 && (
            <div className="mt-8 text-center text-slate-400 text-sm">
              Showing {rfqs.length} open RFQ{rfqs.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
