'use client'

/**
 * My Mechanics Page - Dedicated page for managing favorite mechanics
 * Shows all favorited mechanics with detailed information and quick booking
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Search, Filter, RefreshCw, AlertCircle, ChevronLeft, Users } from 'lucide-react'
import FavoriteMechanicCard, { FavoriteMechanic } from '@/components/customer/FavoriteMechanicCard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function MyMechanicsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'customer' })

  const [favorites, setFavorites] = useState<FavoriteMechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOnline, setFilterOnline] = useState(false)

  // Fetch favorites
  useEffect(() => {
    if (authLoading || !user) return
    fetchFavorites()
  }, [user, authLoading])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/customer/mechanics/favorites')

      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }

      const data = await response.json()
      setFavorites(data.favorites || [])

    } catch (err: any) {
      console.error('[MyMechanics] Error fetching favorites:', err)
      setError(err.message || 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const handleBook = (mechanicId: string) => {
    // Navigate to BookingWizard with mechanic pre-selected
    router.push(`/customer/book-session?mechanic=${mechanicId}`)
  }

  const handleSchedule = (mechanicId: string) => {
    const mechanic = favorites.find(f => f.provider_id === mechanicId)
    if (!mechanic) return

    // Store context for SchedulingWizard
    const schedulingContext = {
      mechanicId: mechanic.provider_id,
      mechanicName: mechanic.provider_name,
      source: 'my_mechanics_page',
      timestamp: new Date().toISOString()
    }
    sessionStorage.setItem('schedulingContext', JSON.stringify(schedulingContext))

    // Navigate to scheduling page
    router.push('/customer/schedule')
  }

  const handleRemove = async (mechanicId: string) => {
    if (!confirm('Remove this mechanic from favorites?')) return

    try {
      const response = await fetch(`/api/customer/mechanics/favorites?mechanic_id=${mechanicId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove favorite')
      }

      // Remove from local state
      setFavorites(prev => prev.filter(f => f.provider_id !== mechanicId))

    } catch (err: any) {
      console.error('[MyMechanics] Error removing favorite:', err)
      alert(err.message || 'Failed to remove favorite')
    }
  }

  // Filter favorites based on search and online status
  const filteredFavorites = favorites.filter(mechanic => {
    const matchesSearch = mechanic.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.brand_specializations.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesOnlineFilter = !filterOnline || mechanic.is_online

    return matchesSearch && matchesOnlineFilter
  })

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading your mechanics...</p>
        </div>
      </div>
    )
  }

  // Auth guard will redirect if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-4 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Heart className="h-8 w-8 text-red-400 fill-current" />
                My Mechanics
              </h1>
              <p className="text-slate-400 mt-2">
                {favorites.length} {favorites.length === 1 ? 'favorite mechanic' : 'favorite mechanics'}
              </p>
            </div>

            <button
              onClick={fetchFavorites}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, location, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Online Filter */}
          <button
            onClick={() => setFilterOnline(!filterOnline)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${filterOnline
                ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }
            `}
          >
            <Filter className="h-4 w-4" />
            {filterOnline ? 'Online Only' : 'All Status'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error loading favorites</p>
              <p className="text-red-300/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && favorites.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Favorite Mechanics Yet</h2>
            <p className="text-slate-400 mb-6">
              Start adding mechanics to your favorites list for quick booking access
            </p>
            <button
              onClick={() => router.push('/customer/book-session')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Browse Mechanics
            </button>
          </div>
        )}

        {/* No Results State */}
        {!loading && favorites.length > 0 && filteredFavorites.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Matching Results</h2>
            <p className="text-slate-400 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterOnline(false)
              }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Mechanics Grid */}
        {!loading && filteredFavorites.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="mb-4 flex items-center justify-between text-sm">
              <p className="text-slate-400">
                Showing {filteredFavorites.length} of {favorites.length} mechanics
              </p>
              <p className="text-slate-400">
                {filteredFavorites.filter(f => f.is_online).length} online now
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFavorites.map((mechanic) => (
                <FavoriteMechanicCard
                  key={mechanic.id}
                  mechanic={mechanic}
                  onBook={handleBook}
                  onSchedule={handleSchedule}
                  onRemove={handleRemove}
                  showActions={true}
                  compact={false}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
