'use client'

/**
 * Step 3: Mechanic Selection
 * Reuses Phase 2 mechanic selection with search, filters, and cards
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, AlertCircle, Info, DollarSign, Star, Heart, HelpCircle, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import MechanicCard, { type MechanicCardData } from '../MechanicCard'
import MechanicProfileModal from '../../MechanicProfileModal'
import { ImprovedLocationSelector } from '../../shared/ImprovedLocationSelector'
import { createClient } from '@/lib/supabase'

const MECHANICS_PER_PAGE = 10

interface MechanicStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export default function MechanicStep({ wizardData, onComplete }: MechanicStepProps) {
  const [mechanicType, setMechanicType] = useState<'standard' | 'brand_specialist' | 'favorite'>(
    wizardData.mechanicType || 'standard'
  )
  const [requestedBrand, setRequestedBrand] = useState<string>(wizardData.requestedBrand || '')
  const [country, setCountry] = useState<string>(wizardData.country || '')
  const [province, setProvince] = useState<string>(wizardData.province || '')
  const [city, setCity] = useState<string>(wizardData.city || '')
  const [postalCode, setPostalCode] = useState<string>(wizardData.postalCode || '')
  const [mechanics, setMechanics] = useState<MechanicCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(wizardData.mechanicId)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    onlineOnly: false,
    brandSpecialists: false,
    highRated: false,
    local: false,
  })
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showLocationEditor, setShowLocationEditor] = useState(false)

  // Sync location from wizardData when profile is loaded
  useEffect(() => {
    if (wizardData.country && !country) setCountry(wizardData.country)
    if (wizardData.province && !province) setProvince(wizardData.province)
    if (wizardData.city && !city) setCity(wizardData.city)
    if (wizardData.postalCode && !postalCode) setPostalCode(wizardData.postalCode)
  }, [wizardData.country, wizardData.province, wizardData.city, wizardData.postalCode])

  // Memoize fetchMechanics to prevent unnecessary re-renders
  const fetchMechanics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: '20',
        request_type: mechanicType === 'brand_specialist' ? 'brand_specialist' : 'general',
      })

      if (mechanicType === 'brand_specialist' && requestedBrand) {
        params.append('requested_brand', requestedBrand)
      }

      if (country) {
        params.append('customer_country', country)
      }

      if (city) {
        params.append('customer_city', city)
      }

      const response = await fetch(`/api/mechanics/available?${params}`)
      if (!response.ok) throw new Error('Failed to fetch mechanics')

      const data = await response.json()
      setMechanics(data.mechanics || [])
    } catch (err: any) {
      console.error('Error fetching mechanics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mechanicType, requestedBrand, country, city])

  useEffect(() => {
    fetchMechanics()

    // Set up polling to refresh mechanic availability every 30 seconds
    // This ensures customers see updated status when mechanics clock in/out
    const intervalId = setInterval(() => {
      fetchMechanics()
    }, 30000) // 30 seconds

    // Set up Supabase real-time subscription for instant updates
    // Listen for changes to mechanics table (clock in/out updates)
    const supabase = createClient()
    const channel = supabase
      .channel('mechanic-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mechanics',
          filter: 'application_status=eq.approved'
        },
        (payload) => {
          console.log('[Mechanic Status] Real-time update:', payload)
          // Refresh mechanics list when any mechanic's status changes
          fetchMechanics()
        }
      )
      .subscribe()

    return () => {
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [fetchMechanics])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [mechanicType, requestedBrand, country, city, searchQuery, filters])

  const filteredMechanics = useMemo(() => {
    let filtered = [...mechanics]

    if (searchQuery.trim()) {
      filtered = filtered.filter((m) =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filters.onlineOnly) {
      filtered = filtered.filter((m) => m.presenceStatus === 'online')
    }

    if (filters.brandSpecialists) {
      filtered = filtered.filter((m) => m.isBrandSpecialist)
    }

    if (filters.highRated) {
      filtered = filtered.filter((m) => m.rating >= 4.5)
    }

    if (filters.local && wizardData.customerPostalCode) {
      // FSA matching logic (first 3 characters)
      const customerFSA = wizardData.customerPostalCode.replace(/\s+/g, '').substring(0, 3).toUpperCase()
      filtered = filtered.filter((m) => {
        if (!m.postalCode) return false
        const mechanicFSA = m.postalCode.replace(/\s+/g, '').substring(0, 3).toUpperCase()
        return mechanicFSA === customerFSA
      })
    }

    return filtered
  }, [mechanics, searchQuery, filters, wizardData.customerPostalCode])

  // Pagination logic - mechanics are already sorted by match score from API
  const paginatedMechanics = useMemo(() => {
    const startIndex = (currentPage - 1) * MECHANICS_PER_PAGE
    const endIndex = startIndex + MECHANICS_PER_PAGE
    return filteredMechanics.slice(startIndex, endIndex)
  }, [filteredMechanics, currentPage])

  const totalPages = Math.ceil(filteredMechanics.length / MECHANICS_PER_PAGE)

  const handleMechanicSelect = (mechanicId: string) => {
    const mechanic = mechanics.find((m) => m.id === mechanicId)
    if (!mechanic) return

    // Dynamic pricing: Apply specialist premium if:
    // 1. User selected "Specialist" tab, OR
    // 2. User selected "Favorites" tab AND the mechanic is a brand specialist
    const applySpecialistPremium =
      mechanicType === 'brand_specialist' ||
      (mechanicType === 'favorite' && mechanic.isBrandSpecialist)

    setSelectedMechanicId(mechanicId)
    onComplete({
      mechanicId,
      mechanicName: mechanic.name,
      mechanicType: applySpecialistPremium ? 'brand_specialist' : 'standard',
      requestedBrand: mechanicType === 'brand_specialist' ? requestedBrand : null,
      specialistPremium: applySpecialistPremium ? 15 : 0,
      isBrandSpecialist: mechanic.isBrandSpecialist,
      country,
      province,
      city,
      postalCode,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Choose Your Mechanic</h3>
        <p className="text-slate-400">Select from available mechanics based on your preferences</p>
      </div>

      {/* Info Box - Mechanic Types Explanation */}
      <div className="max-w-3xl mx-auto bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-200 mb-2">Choose Your Mechanic Type:</h4>
            <div className="space-y-1.5 text-xs text-blue-200/80">
              <div className="flex items-start gap-2">
                <Star className="h-3.5 w-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-100">Standard Mechanic:</strong> General automotive expertise for all makes and models. Included in your plan.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-100">Brand Specialist:</strong> Expert in specific vehicle brands (e.g., BMW, Toyota). <span className="text-yellow-300 font-semibold">+$15 premium charge</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Heart className="h-3.5 w-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-100">My Favorites:</strong> Mechanics you've worked with before and saved. <span className="text-slate-300">Note: If your favorite is a brand specialist, the +$15 premium still applies.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mechanic Type Selector (Segmented Control) */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => setMechanicType('standard')}
          className={`group relative flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            mechanicType === 'standard'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="General mechanics for all vehicle types"
        >
          <div className="flex items-center justify-center gap-2">
            <Star className="h-4 w-4" />
            <span>Standard Mechanic</span>
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Included</div>
        </button>
        <button
          onClick={() => setMechanicType('brand_specialist')}
          className={`group relative flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            mechanicType === 'brand_specialist'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Specialists for specific vehicle brands - Premium service"
        >
          <div className="flex items-center justify-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Brand Specialist</span>
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">+$15</div>
        </button>
        <button
          onClick={() => setMechanicType('favorite')}
          className={`group relative flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            mechanicType === 'favorite'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Your saved favorite mechanics"
        >
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-4 w-4" />
            <span>My Favorites</span>
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Included</div>
        </button>
      </div>

      {/* Brand Input for Specialist */}
      {mechanicType === 'brand_specialist' && (
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Brand</label>
          <input
            type="text"
            value={requestedBrand}
            onChange={(e) => setRequestedBrand(e.target.value)}
            onBlur={() => requestedBrand && fetchMechanics()}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., Toyota, Honda, Ford"
          />
        </div>
      )}

      {/* Compact Location Display */}
      <div className="max-w-3xl mx-auto">
        {!showLocationEditor ? (
          // Compact Summary View
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
                  <MapPin className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-300">Your Location</span>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      From profile
                    </span>
                  </div>
                  <div className="text-base font-semibold text-white">
                    {city && province && country ? (
                      <span>{city}, {province}, {country}</span>
                    ) : (
                      <span className="text-slate-400">Not set - Click "Change" to add location</span>
                    )}
                  </div>
                  {postalCode && (
                    <div className="text-xs text-slate-400 mt-1">Postal Code: {postalCode}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowLocationEditor(true)}
                className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          // Expanded Editor View
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Update Your Location</h4>
              <button
                onClick={() => setShowLocationEditor(false)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Collapse
              </button>
            </div>

            {/* Location Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-200/80">
                  We use your location to find mechanics near you and show the closest matches first.
                </p>
              </div>
            </div>

            {/* Location Selector */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Country, Province/State, City
              </label>
              <ImprovedLocationSelector
                country={country}
                city={city}
                province={province}
                onCountryChange={(country, timezone) => setCountry(country)}
                onCityChange={(city, province, timezone) => {
                  setCity(city)
                  setProvince(province)
                }}
                onProvinceChange={(province) => setProvince(province)}
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                Postal Code <span className="text-slate-500">(Optional)</span>
                <span className="text-xs text-blue-400 flex items-center gap-1" title="Postal code helps us find the absolute closest mechanics">
                  <HelpCircle className="h-3.5 w-3.5" />
                  For precise matching
                </span>
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., M5H 2N2"
                maxLength={7}
              />
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Adding postal code prioritizes mechanics in your exact neighborhood
              </p>
            </div>

            {/* Apply Button */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  // Don't call onComplete here - just update local state and re-fetch
                  // Location changes will be saved when user selects a mechanic
                  setShowLocationEditor(false)
                  // Re-fetch mechanics with new location
                  fetchMechanics()
                }}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  // Revert changes by restoring from wizardData
                  setCountry(wizardData.country || '')
                  setProvince(wizardData.province || '')
                  setCity(wizardData.city || '')
                  setPostalCode(wizardData.postalCode || '')
                  setShowLocationEditor(false)
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search mechanics by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setFilters({ ...filters, onlineOnly: !filters.onlineOnly })}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            filters.onlineOnly
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          🟢 Online Now
        </button>
        {/* Only show Brand Specialists filter on Specialist tab */}
        {mechanicType === 'brand_specialist' && (
          <button
            onClick={() => setFilters({ ...filters, brandSpecialists: !filters.brandSpecialists })}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              filters.brandSpecialists
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            🔧 Brand Specialists
          </button>
        )}
        <button
          onClick={() => setFilters({ ...filters, highRated: !filters.highRated })}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            filters.highRated
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          ⭐ 4.5+ Rating
        </button>
        <button
          onClick={() => setFilters({ ...filters, local: !filters.local })}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            filters.local
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          📍 Local
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-12 w-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400">Finding available mechanics...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <h4 className="font-semibold text-red-200">Error Loading Mechanics</h4>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && filteredMechanics.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Showing {((currentPage - 1) * MECHANICS_PER_PAGE) + 1}-{Math.min(currentPage * MECHANICS_PER_PAGE, filteredMechanics.length)} of {filteredMechanics.length} mechanic{filteredMechanics.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Mechanics Grid */}
      {!loading && !error && (
        <>
          {filteredMechanics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-2">No mechanics found matching your criteria</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilters({ onlineOnly: false, brandSpecialists: false, highRated: false, local: false })
                }}
                className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedMechanics.map((mechanic) => (
                  <MechanicCard
                    key={mechanic.id}
                    mechanic={mechanic}
                    isSelected={selectedMechanicId === mechanic.id}
                    onSelect={handleMechanicSelect}
                    onViewProfile={(id) => {
                      setSelectedProfileId(id)
                      setShowProfileModal(true)
                    }}
                    showSpecialistPremium={mechanicType === 'favorite'}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition ${
                      currentPage === 1
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)

                      // Show ellipsis
                      if (!showPage) {
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-2 text-slate-500">
                              ...
                            </span>
                          )
                        }
                        return null
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition ${
                            currentPage === page
                              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition ${
                      currentPage === totalPages
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Profile Modal */}
      {selectedProfileId && (
        <MechanicProfileModal
          mechanicId={selectedProfileId}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false)
            setSelectedProfileId(null)
          }}
        />
      )}
    </div>
  )
}
