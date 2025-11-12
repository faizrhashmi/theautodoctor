'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, Search, Loader2, AlertCircle, ArrowRight, Crown } from 'lucide-react'

interface Brand {
  id: string
  brand_name: string
  brand_logo_url: string | null
  is_luxury: boolean
  requires_certification: boolean
  active: boolean
}

export default function SpecialistsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLuxuryOnly, setShowLuxuryOnly] = useState(false)

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (!response.ok) {
          throw new Error('Failed to fetch brands')
        }
        const data = await response.json()
        setBrands(data)
        setFilteredBrands(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchBrands()
  }, [])

  useEffect(() => {
    let filtered = brands

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((brand) =>
        brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by luxury
    if (showLuxuryOnly) {
      filtered = filtered.filter((brand) => brand.is_luxury)
    }

    setFilteredBrands(filtered)
  }, [searchQuery, showLuxuryOnly, brands])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="text-slate-300">Loading specialists...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-1">Error Loading Specialists</h3>
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const luxuryBrands = brands.filter((b) => b.is_luxury)

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-6 w-6 sm:h-7 sm:w-7 text-orange-400" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Brand Specialists
            </h1>
          </div>
          <p className="text-slate-400 text-sm sm:text-base">
            Connect with certified mechanics who specialize in your vehicle's brand
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {brands.length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Brands Available</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {luxuryBrands.length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Luxury Brands</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400 mb-1">
              $29.99+
            </div>
            <div className="text-xs sm:text-sm text-slate-400">Starting Price</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
              />
            </div>

            {/* Luxury Filter Toggle */}
            <button
              onClick={() => setShowLuxuryOnly(!showLuxuryOnly)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                showLuxuryOnly
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Crown className="h-4 w-4" />
              <span className="text-sm">Luxury Only</span>
            </button>
          </div>
        </div>

        {/* Brands Grid */}
        {filteredBrands.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center">
            <Search className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No brands found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/customer/book-session?specialist=${encodeURIComponent(brand.brand_name)}`}
                className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-5 hover:border-orange-500/50 hover:bg-slate-800/70 transition-all"
              >
                <div className="flex flex-col h-full">
                  {/* Brand Logo/Name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {brand.brand_logo_url ? (
                        <img
                          src={brand.brand_logo_url}
                          alt={brand.brand_name}
                          className="h-8 w-auto object-contain mb-2"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-2">
                          <span className="text-white font-bold text-lg">
                            {brand.brand_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <h3 className="text-white font-bold text-base sm:text-lg">
                        {brand.brand_name}
                      </h3>
                    </div>
                    {brand.is_luxury && (
                      <div className="bg-orange-500/20 border border-orange-500/30 rounded-full p-1.5">
                        <Crown className="h-3.5 w-3.5 text-orange-400" />
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded">
                      Certified
                    </span>
                    {brand.requires_certification && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded">
                        Factory Trained
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto flex items-center justify-between text-sm">
                    <span className="text-slate-400 group-hover:text-orange-400 transition-colors font-medium">
                      Book Now
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">
                Why Choose a Brand Specialist?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Brand specialists have extensive training and experience with your specific vehicle make.
                They understand common issues, recall information, and manufacturer-specific diagnostic
                procedures that general mechanics may not be familiar with.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
