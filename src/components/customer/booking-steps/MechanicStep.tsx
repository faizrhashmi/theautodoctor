'use client'

/**
 * Step 3: Mechanic Selection
 * Reuses Phase 2 mechanic selection with search, filters, and cards
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, AlertCircle, Info, DollarSign, Star, Heart, HelpCircle, ChevronLeft, ChevronRight, MapPin, Crown, Check } from 'lucide-react'
import MechanicCard, { type MechanicCardData } from '../MechanicCard'
import MechanicProfileModal from '../../MechanicProfileModal'
import { ImprovedLocationSelector } from '../../shared/ImprovedLocationSelector'
import AllMechanicsOfflineCard from '../AllMechanicsOfflineCard'
import { createClient } from '@/lib/supabase'

const MECHANICS_PER_PAGE = 10

interface MechanicStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export default function MechanicStep({ wizardData, onComplete }: MechanicStepProps) {
  const supabase = createClient()
  const [mechanicType, setMechanicType] = useState<'standard' | 'brand_specialist'>(
    wizardData.requestedBrand ? 'brand_specialist' : (wizardData.mechanicType || 'standard')
  )
  const [requestedBrand, setRequestedBrand] = useState<string>(wizardData.requestedBrand || '')
  const [country, setCountry] = useState<string>(wizardData.country || '')
  const [province, setProvince] = useState<string>(wizardData.province || '')
  const [city, setCity] = useState<string>(wizardData.city || '')
  const [postalCode, setPostalCode] = useState<string>(wizardData.postalCode || '')
  const [mechanics, setMechanics] = useState<MechanicCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 🚨 CRITICAL SECURITY FIX: NEVER pre-select mechanic from wizardData
  // Could contain offline mechanic ID, allowing security bypass
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null)
  const [favoriteMechanicIds, setFavoriteMechanicIds] = useState<Set<string>>(new Set())
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
  const [showLocationEditor, setShowLocationEditor] = useState(false) // ✅ FIXED: Collapsed by default
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [currentSpecialistPremium, setCurrentSpecialistPremium] = useState<number>(15)
  const [showSpecialistChangeModal, setShowSpecialistChangeModal] = useState(false)
  const [pendingMechanicType, setPendingMechanicType] = useState<string>('')
  const [showFavoriteSpecialistModal, setShowFavoriteSpecialistModal] = useState(false)
  const [selectedFavoriteSpecialist, setSelectedFavoriteSpecialist] = useState<any>(null)

  // Sync location from wizardData when profile is loaded
  useEffect(() => {
    if (wizardData.country && !country) setCountry(wizardData.country)
    if (wizardData.province && !province) setProvince(wizardData.province)
    if (wizardData.city && !city) setCity(wizardData.city)
    if (wizardData.postalCode && !postalCode) setPostalCode(wizardData.postalCode)
  }, [wizardData.country, wizardData.province, wizardData.city, wizardData.postalCode])

  // Fetch specialist premium from database
  useEffect(() => {
    async function fetchSpecialistPremium() {
      if (requestedBrand || wizardData.requestedBrand) {
        const brand = requestedBrand || wizardData.requestedBrand
        const { data } = await supabase
          .from('brand_specializations')
          .select('specialist_premium')
          .eq('brand_name', brand)
          .single()

        if (data?.specialist_premium) {
          setCurrentSpecialistPremium(data.specialist_premium)
        }
      }
    }
    fetchSpecialistPremium()
  }, [requestedBrand, wizardData.requestedBrand])

  // ✅ NEW: Fetch user's favorites on mount
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch('/api/customer/mechanics/favorites')
        if (response.ok) {
          const data = await response.json()
          // Use mechanic_id field from the API response
          const favoriteIds = new Set(data.favorites?.map((fav: any) => fav.mechanic_id || fav.provider_id) || [])
          setFavoriteMechanicIds(favoriteIds)
          console.log('Loaded favorites:', Array.from(favoriteIds))
        }
      } catch (error) {
        console.error('Error fetching favorites:', error)
      }
    }
    fetchFavorites()
  }, [])

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

      if (postalCode) {
        params.append('customer_postal_code', postalCode)
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
  }, [mechanicType, requestedBrand, country, city, postalCode])

  // ✅ Real-time subscription for live status updates (no polling to avoid UX issues)
  useEffect(() => {
    const supabase = createClient()

    // Real-time subscription - listens for mechanic table updates
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
          console.log('[Mechanic Status] Real-time update received:', payload)
          // Only refresh if we've already searched (don't auto-fetch on mount)
          if (hasSearched) {
            console.log('[Mechanic Status] Refreshing mechanics list due to real-time update')
            fetchMechanics()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Mechanic Status] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMechanics, hasSearched])

  // Manual search handler
  const handleSearch = async () => {
    setSearching(true)
    setHasSearched(true)
    await fetchMechanics()
    setSearching(false)
  }

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

  // Handle tab change with confirmation modal if switching away from specialist
  const handleTabChange = (newType: 'standard' | 'brand_specialist') => {
    // If switching FROM specialist TO something else, show confirmation
    if (wizardData.requestedBrand && mechanicType === 'brand_specialist' && newType !== 'brand_specialist') {
      setPendingMechanicType(newType)
      setShowSpecialistChangeModal(true)
    } else {
      setMechanicType(newType)
      setSelectedMechanicId(null) // Clear selection when switching tabs
    }
  }

  const confirmSpecialistChange = () => {
    setMechanicType(pendingMechanicType as 'standard' | 'brand_specialist')
    setSelectedMechanicId(null)
    setShowSpecialistChangeModal(false)
    setPendingMechanicType('')
  }

  const cancelSpecialistChange = () => {
    setShowSpecialistChangeModal(false)
    setPendingMechanicType('')
  }

  // ✅ NEW: Handle favorite changes
  const handleFavoriteChange = (mechanicId: string, isFavorite: boolean) => {
    setFavoriteMechanicIds((prev) => {
      const updated = new Set(prev)
      if (isFavorite) {
        updated.add(mechanicId)
      } else {
        updated.delete(mechanicId)
      }
      return updated
    })
  }

  const handleMechanicSelect = async (mechanicId: string) => {
    const mechanic = mechanics.find((m) => m.id === mechanicId)
    if (!mechanic) return

    // ✅ CRITICAL FIX: BookingWizard is for INSTANT sessions - only online mechanics allowed
    if (mechanic.presenceStatus !== 'online') {
      alert('This mechanic is currently offline. Please use "Schedule for Later" to book with this mechanic, or choose an online mechanic for an instant session.')
      return
    }

    // Check if this is a specialist (no favorites tab anymore)
    if (mechanic.isBrandSpecialist && mechanicType === 'brand_specialist') {
      // Fetch the specialist premium for this mechanic's brands
      const { data: mechData } = await supabase
        .from('profiles')
        .select(`
          certifications (
            brand
          )
        `)
        .eq('id', mechanicId)
        .single()

      if (mechData && mechData.certifications && mechData.certifications.length > 0) {
        const certifiedBrand = (mechData.certifications[0] as any).brand

        const { data: brand } = await supabase
          .from('brand_specializations')
          .select('specialist_premium')
          .eq('brand_name', certifiedBrand)
          .single()

        const premium = brand?.specialist_premium || 15

        setSelectedFavoriteSpecialist({
          ...mechanic,
          certifiedBrand,
          specialistPremium: premium
        })
        setShowFavoriteSpecialistModal(true)
        return
      }
    }

    // Dynamic pricing: Apply specialist premium if user selected "Specialist" tab
    const applySpecialistPremium = mechanicType === 'brand_specialist'

    // Fetch actual premium for specialist
    let actualPremium = 0
    if (applySpecialistPremium) {
      if (mechanicType === 'brand_specialist' && requestedBrand) {
        const { data: brand } = await supabase
          .from('brand_specializations')
          .select('specialist_premium')
          .eq('brand_name', requestedBrand)
          .single()
        actualPremium = brand?.specialist_premium || 15
      }
    }

    setSelectedMechanicId(mechanicId)
    onComplete({
      mechanicId,
      mechanicName: mechanic.name,
      mechanicType: applySpecialistPremium ? 'brand_specialist' : 'standard',
      requestedBrand: mechanicType === 'brand_specialist' ? requestedBrand : null,
      specialistPremium: actualPremium,
      isBrandSpecialist: mechanic.isBrandSpecialist,
      mechanicPresenceStatus: mechanic.presenceStatus, // ✅ CRITICAL: Include presence status for Continue button validation
      country,
      province,
      city,
      postalCode,
    })
  }

  const confirmFavoriteSpecialist = () => {
    if (!selectedFavoriteSpecialist) return

    setSelectedMechanicId(selectedFavoriteSpecialist.id)
    onComplete({
      mechanicId: selectedFavoriteSpecialist.id,
      mechanicName: selectedFavoriteSpecialist.name,
      mechanicType: 'brand_specialist',
      requestedBrand: selectedFavoriteSpecialist.certifiedBrand,
      specialistPremium: selectedFavoriteSpecialist.specialistPremium,
      isBrandSpecialist: true,
      mechanicPresenceStatus: selectedFavoriteSpecialist.presenceStatus,
      country,
      province,
      city,
      postalCode,
    })
    setShowFavoriteSpecialistModal(false)
    setSelectedFavoriteSpecialist(null)
  }

  const cancelFavoriteSpecialist = () => {
    setShowFavoriteSpecialistModal(false)
    setSelectedFavoriteSpecialist(null)
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
            </div>
          </div>
        </div>
      </div>

      {/* Banner for Specialist Request */}
      {wizardData.requestedBrand && mechanicType === 'brand_specialist' && (
        <div className="max-w-3xl mx-auto bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-200">
              🎯 Showing <strong>{wizardData.requestedBrand}</strong> specialists only.
              {' '}Switch to "Standard Mechanic" or "My Favorites" to see all available mechanics.
            </p>
          </div>
        </div>
      )}

      {/* Mechanic Type Selector (Segmented Control) */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => handleTabChange('standard')}
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
          onClick={() => handleTabChange('brand_specialist')}
          className={`group relative flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            mechanicType === 'brand_specialist'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title="Specialists for specific vehicle brands - Premium service"
        >
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-4 w-4" />
            <span>Brand Specialist</span>
          </div>
          <div className="text-[10px] opacity-70 mt-0.5">Premium Service</div>
        </button>
        {/* ✅ Favorites tab removed - Users can access favorites via dashboard card or /customer/my-mechanics page */}
      </div>

      {/* Brand Input for Specialist */}
      {mechanicType === 'brand_specialist' && (
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Brand</label>
          <input
            type="text"
            value={requestedBrand}
            onChange={(e) => setRequestedBrand(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., Toyota, Honda, Ford"
          />
        </div>
      )}

      {/* ✅ NEW: Manual Search Button */}
      <div className="max-w-3xl mx-auto">
        <button
          onClick={handleSearch}
          disabled={searching || !city}
          className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            searching || !city
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 active:scale-98'
          }`}
        >
          {searching ? (
            <>
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Searching for Mechanics...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Find Available Mechanics</span>
            </>
          )}
        </button>
        {!city && !hasSearched && (
          <p className="text-sm text-amber-400 mt-2 text-center">
            💡 Please set your location below to search for mechanics
          </p>
        )}
        {hasSearched && mechanics.length === 0 && (
          <p className="text-sm text-slate-400 mt-2 text-center">
            No mechanics found. Try adjusting your location or filters.
          </p>
        )}
      </div>

      {/* Compact Location Display */}
      <div className="max-w-3xl mx-auto">
        {/* Compact Summary View */}
        <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${showLocationEditor ? 'hidden' : 'block'}`}>
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
                    <span>
                      {city}, {province}, {country}
                      {postalCode && <span className="text-slate-400"> • {postalCode}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set - Click "Change" to add location</span>
                  )}
                </div>
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

        {/* Expanded Editor View - Always rendered, just hidden */}
        <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4 ${showLocationEditor ? 'block' : 'hidden'}`}>
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

          {/* Location Selector with Postal Code */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Country, Province/State, City & Postal Code
            </label>
            <ImprovedLocationSelector
              country={country}
              city={city}
              province={province}
              postalCode={postalCode}
              onCountryChange={(country, timezone) => setCountry(country)}
              onCityChange={(city, province, timezone) => {
                setCity(city)
                setProvince(province)
              }}
              onProvinceChange={(province) => setProvince(province)}
              onPostalCodeChange={(postalCode) => setPostalCode(postalCode)}
            />
          </div>

          {/* Apply Button */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                // Save location changes to wizard data immediately
                onComplete({
                  ...wizardData,
                  country,
                  province,
                  city,
                  postalCode,
                })
                setShowLocationEditor(false)
                // ✅ FIXED: Don't auto-fetch, user must click "Find Available Mechanics" button
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

      {/* All Mechanics Offline State - Phase 6 */}
      {!loading && !error && mechanics.length > 0 && mechanics.every((m) => m.presenceStatus !== 'online') && (
        <AllMechanicsOfflineCard
          wizardData={wizardData}
          onBrowseMechanics={() => {
            // Show offline mechanics by disabling onlineOnly filter
            setFilters({ ...filters, onlineOnly: false })
          }}
          className="mb-6"
        />
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
                    mechanic={{
                      ...mechanic,
                      isFavorite: favoriteMechanicIds.has(mechanic.id) // ✅ NEW: Pass favorite status
                    }}
                    isSelected={selectedMechanicId === mechanic.id}
                    onSelect={handleMechanicSelect}
                    onViewProfile={(id) => {
                      setSelectedProfileId(id)
                      setShowProfileModal(true)
                    }}
                    showSpecialistPremium={false} // No longer used - premium shown via specialistPremiumAmount
                    specialistPremiumAmount={mechanic.isBrandSpecialist ? currentSpecialistPremium : undefined} // ✅ NEW: Dynamic premium
                    showScheduleButton={true} // ✅ NEW: Enable "Schedule for Later" button
                    showFavoriteButton={true} // ✅ NEW: Enable "Add to Favorites" button
                    wizardData={wizardData} // ✅ NEW: Pass wizard data for context
                    onFavoriteChange={handleFavoriteChange} // ✅ NEW: Handle favorite changes
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

      {/* Specialist Change Confirmation Modal */}
      {showSpecialistChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  Switch from {wizardData.requestedBrand} Specialist?
                </h3>
                <p className="text-sm text-slate-300">
                  You initially requested a <strong>{wizardData.requestedBrand}</strong> specialist.
                  {' '}Are you sure you want to switch to {pendingMechanicType === 'standard' ? 'Standard Mechanics' : 'My Favorites'}?
                </p>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-orange-200">
                💡 <strong>Note:</strong> You'll lose the specialist filter and see all available mechanics.
                {' '}You can always switch back to "Brand Specialist" tab.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSpecialistChange}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
              >
                Yes, Switch
              </button>
              <button
                onClick={cancelSpecialistChange}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorite Specialist Confirmation Modal */}
      {showFavoriteSpecialistModal && selectedFavoriteSpecialist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  Specialist Premium Applies
                </h3>
                <p className="text-sm text-slate-300">
                  <strong>{selectedFavoriteSpecialist.name}</strong> is a certified{' '}
                  <strong>{selectedFavoriteSpecialist.certifiedBrand}</strong> specialist.
                </p>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orange-200">Specialist Premium:</span>
                <span className="text-lg font-bold text-orange-300">
                  +${selectedFavoriteSpecialist.specialistPremium.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-orange-200/80">
                This will be added to your plan price for this session.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200">
                  <strong>Why the premium?</strong> Specialists have extensive training and certifications
                  {' '}for your vehicle brand, providing expert-level service.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmFavoriteSpecialist}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
              >
                Continue with Specialist
              </button>
              <button
                onClick={cancelFavoriteSpecialist}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
