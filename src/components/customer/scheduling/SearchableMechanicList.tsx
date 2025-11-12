'use client'

/**
 * SearchableMechanicList - Step 4 of SchedulingPage
 * Powerful search and filter for ALL mechanics (online + offline)
 *
 * Key Features:
 * - Full-text search (name, workshop, specialty, location)
 * - Multiple filter chips (online/offline, favorites, brand specialists, Red Seal)
 * - Sort options (rating, distance, sessions, name)
 * - Shows ALL mechanics regardless of online status
 */

import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, X, Loader2 } from 'lucide-react'

interface Mechanic {
  user_id: string
  full_name: string
  email?: string
  currently_on_shift: boolean
  mechanic_type: 'virtual_only' | 'independent_workshop' | 'workshop_affiliated'
  rating: number
  total_sessions: number
  city?: string
  state_province?: string
  postal_code?: string
  specialties?: string[]
  brand_specialties?: string[]
  certifications?: Array<{ type: string; name: string }>
  is_favorite?: boolean
  workshop?: {
    name: string
    address_line1: string
    city: string
    state_province: string
  }
}

interface SearchableMechanicListProps {
  sessionType: 'online' | 'in_person'
  wizardData: any
  onComplete: (data: { mechanicId: string; mechanicName: string }) => void
  onBack?: () => void
}

export default function SearchableMechanicList({
  sessionType,
  wizardData,
  onComplete,
  onBack
}: SearchableMechanicListProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    onlineOnly: false,
    offlineOnly: false,
    favoritesOnly: false,
    brandSpecialist: false,
    redSealOnly: false
  })
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'sessions' | 'name'>('rating')

  // Fetch mechanics on mount
  useEffect(() => {
    fetchMechanics()
  }, [sessionType])

  const fetchMechanics = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        sessionType: sessionType,
      })

      const response = await fetch(`/api/mechanics/available?${params.toString()}`)
      const data = await response.json()

      setMechanics(data.mechanics || [])
    } catch (error) {
      console.error('[SearchableMechanicList] Error fetching mechanics:', error)
      setMechanics([])
    } finally {
      setLoading(false)
    }
  }

  // SEARCH & FILTER LOGIC
  const filteredMechanics = useMemo(() => {
    let result = mechanics

    // 1. Text Search (name, workshop, specialties, location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(mechanic => {
        const searchableText = [
          mechanic.full_name,
          mechanic.workshop?.name || '',
          mechanic.specialties?.join(' ') || '',
          mechanic.city || '',
          mechanic.state_province || '',
          mechanic.postal_code || '',
          mechanic.certifications?.map(c => c.name).join(' ') || ''
        ].join(' ').toLowerCase()

        return searchableText.includes(query)
      })
    }

    // 2. Online/Offline Filter
    if (filters.onlineOnly) {
      result = result.filter(m => m.currently_on_shift === true)
    }
    if (filters.offlineOnly) {
      result = result.filter(m => m.currently_on_shift === false)
    }

    // 3. Favorites Filter
    if (filters.favoritesOnly) {
      result = result.filter(m => m.is_favorite === true)
    }

    // 4. Brand Specialist Filter
    if (filters.brandSpecialist) {
      result = result.filter(m => m.brand_specialties && m.brand_specialties.length > 0)
    }

    // 5. Red Seal Certification Filter
    if (filters.redSealOnly) {
      result = result.filter(m =>
        m.certifications?.some(c => c.type === 'red_seal')
      )
    }

    // 6. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'sessions':
          return b.total_sessions - a.total_sessions
        case 'name':
          return a.full_name.localeCompare(b.full_name)
        default:
          return 0
      }
    })

    return result
  }, [mechanics, searchQuery, filters, sortBy])

  // STATS
  const stats = {
    total: mechanics.length,
    online: mechanics.filter(m => m.currently_on_shift).length,
    offline: mechanics.filter(m => !m.currently_on_shift).length,
    favorites: mechanics.filter(m => m.is_favorite).length,
    brandSpecialists: mechanics.filter(m => m.brand_specialties?.length > 0).length,
    redSeal: mechanics.filter(m => m.certifications?.some(c => c.type === 'red_seal')).length,
    filtered: filteredMechanics.length
  }

  const handleSelect = (mechanic: Mechanic) => {
    onComplete({
      mechanicId: mechanic.user_id,
      mechanicName: mechanic.full_name
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-orange-500 animate-spin" />
          <p className="text-slate-400">Loading mechanics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Select Your Mechanic
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Choose from {stats.total} available mechanics. You can search and filter to find the perfect match.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, workshop, specialty, location..."
          className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm sm:text-base"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Examples */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Try:</span>
          {['Toronto', 'Honda', 'Red Seal', 'Diagnostics', 'BMW'].map(example => (
            <button
              key={example}
              onClick={() => setSearchQuery(example)}
              className="text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Filter Chips */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Filters:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Online/Offline Toggle */}
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              onlineOnly: !prev.onlineOnly,
              offlineOnly: false
            }))}
            className={`
              px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
              ${filters.onlineOnly
                ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🟢 Online ({stats.online})
          </button>

          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              offlineOnly: !prev.offlineOnly,
              onlineOnly: false
            }))}
            className={`
              px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
              ${filters.offlineOnly
                ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🔴 Offline ({stats.offline})
          </button>

          {/* Favorites */}
          {stats.favorites > 0 && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
              className={`
                px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
                ${filters.favoritesOnly
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                }
              `}
            >
              ⭐ Favorites ({stats.favorites})
            </button>
          )}

          {/* Brand Specialists */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, brandSpecialist: !prev.brandSpecialist }))}
            className={`
              px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
              ${filters.brandSpecialist
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            💎 Specialists ({stats.brandSpecialists})
          </button>

          {/* Red Seal */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, redSealOnly: !prev.redSealOnly }))}
            className={`
              px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
              ${filters.redSealOnly
                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
              }
            `}
          >
            🏆 Red Seal ({stats.redSeal})
          </button>

          {/* Clear Filters */}
          {Object.values(filters).some(v => v) && (
            <button
              onClick={() => setFilters({
                onlineOnly: false,
                offlineOnly: false,
                favoritesOnly: false,
                brandSpecialist: false,
                redSealOnly: false
              })}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition"
            >
              <X className="h-4 w-4 inline mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-slate-400">
          Showing <span className="text-white font-semibold">{stats.filtered}</span> of {stats.total} mechanics
          {searchQuery && (
            <span className="ml-2">
              for "<span className="text-orange-400">{searchQuery}</span>"
            </span>
          )}
        </div>

        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="rating">Highest Rated</option>
          <option value="sessions">Most Sessions</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Mechanics List */}
      {filteredMechanics.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No mechanics found</h3>
          <p className="text-sm text-slate-400 mb-4">
            {searchQuery
              ? `No results for "${searchQuery}". Try adjusting your search or filters.`
              : 'No mechanics match your current filters.'
            }
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setFilters({
                onlineOnly: false,
                offlineOnly: false,
                favoritesOnly: false,
                brandSpecialist: false,
                redSealOnly: false
              })
            }}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 rounded-lg transition text-sm"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMechanics.map(mechanic => (
            <MechanicCard
              key={mechanic.user_id}
              mechanic={mechanic}
              sessionType={sessionType}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Mechanic Card Component
function MechanicCard({
  mechanic,
  sessionType,
  onSelect
}: {
  mechanic: Mechanic
  sessionType: 'online' | 'in_person'
  onSelect: (mechanic: Mechanic) => void
}) {
  return (
    <button
      onClick={() => onSelect(mechanic)}
      className="w-full bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 rounded-lg p-4 transition-all text-left"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-base sm:text-lg">
            {mechanic.full_name}
          </h3>

          {/* Online Status */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {mechanic.currently_on_shift ? (
              <>
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-400">Online now</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 bg-slate-500 rounded-full"></span>
                <span className="text-xs text-slate-500">Offline</span>
              </>
            )}

            {/* Mechanic Type Badge */}
            {mechanic.mechanic_type === 'virtual_only' && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                💻 Virtual
              </span>
            )}
            {mechanic.mechanic_type === 'independent_workshop' && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                🏪 Independent
              </span>
            )}
            {mechanic.mechanic_type === 'workshop_affiliated' && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                🏢 Workshop
              </span>
            )}
          </div>
        </div>

        {/* Rating & Stats */}
        <div className="text-right ml-3">
          <div className="text-yellow-400 text-sm font-semibold flex items-center gap-1">
            ★ {mechanic.rating.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">{mechanic.total_sessions} sessions</div>
        </div>
      </div>

      {/* Workshop Info (for in-person) */}
      {sessionType === 'in_person' && mechanic.workshop && (
        <div className="mb-3 p-2 bg-slate-700/30 rounded text-sm">
          <div className="font-semibold text-slate-300">
            📍 {mechanic.workshop.name}
          </div>
          <div className="text-slate-400 text-xs mt-1">
            {mechanic.workshop.address_line1}, {mechanic.workshop.city}, {mechanic.workshop.state_province}
          </div>
        </div>
      )}

      {/* Specialties */}
      {mechanic.specialties && mechanic.specialties.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Specialties:</div>
          <div className="flex flex-wrap gap-1">
            {mechanic.specialties.slice(0, 5).map((specialty, idx) => (
              <span
                key={idx}
                className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {mechanic.certifications && mechanic.certifications.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {mechanic.certifications.map((cert, idx) => (
            <span
              key={idx}
              className={`
                text-xs px-2 py-0.5 rounded
                ${cert.type === 'red_seal'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'bg-blue-500/20 text-blue-300'
                }
              `}
            >
              {cert.type === 'red_seal' ? '🏆 Red Seal' : cert.name}
            </span>
          ))}
        </div>
      )}

      {/* Location */}
      <div className="text-xs text-slate-500">
        📍 {mechanic.city}, {mechanic.state_province}
        {mechanic.postal_code && ` • ${mechanic.postal_code}`}
      </div>

      {/* Helpful message for online mechanics */}
      {mechanic.currently_on_shift && (
        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
          💡 This mechanic is online now. You can also book them immediately via "Book Now" if you need help right away.
        </div>
      )}
    </button>
  )
}
