'use client'

/**
 * MyMechanicsDashboardCard - Compact card for dashboard showing top favorite mechanics
 * Shows 3 favorites with quick access to full page
 */

import { useState, useEffect } from 'react'
import { Heart, ArrowRight, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FavoriteMechanic } from '@/components/customer/FavoriteMechanicCard'

export default function MyMechanicsDashboardCard() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteMechanic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/mechanics/favorites')

      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites || [])
      }
    } catch (err) {
      console.error('[MyMechanicsDashboardCard] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickBook = (mechanicId: string, isOnline: boolean) => {
    if (isOnline) {
      router.push(`/customer/book-session?mechanic=${mechanicId}`)
    } else {
      const mechanic = favorites.find(f => f.provider_id === mechanicId)
      if (!mechanic) return

      // Store context for SchedulingWizard
      const schedulingContext = {
        mechanicId: mechanic.provider_id,
        mechanicName: mechanic.provider_name,
        source: 'dashboard_card',
        timestamp: new Date().toISOString()
      }
      sessionStorage.setItem('schedulingContext', JSON.stringify(schedulingContext))
      router.push('/customer/schedule')
    }
  }

  // Don't show card if no favorites
  if (!loading && favorites.length === 0) {
    return null
  }

  // Show top 3 favorites
  const topFavorites = favorites.slice(0, 3)
  const onlineCount = favorites.filter(f => f.is_online).length

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400 fill-current" />
          <h2 className="text-lg font-bold text-white">My Mechanics</h2>
        </div>
        <Link
          href="/customer/my-mechanics"
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Users className="w-4 h-4" />
          <span>{favorites.length} favorites</span>
        </div>
        {onlineCount > 0 && (
          <div className="flex items-center gap-1.5 text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>{onlineCount} online</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-slate-700/30 rounded-lg h-20"></div>
          ))}
        </div>
      )}

      {/* Mechanics List */}
      {!loading && topFavorites.length > 0 && (
        <div className="space-y-3">
          {topFavorites.map((mechanic) => (
            <div
              key={mechanic.id}
              className="bg-slate-900/50 rounded-lg border border-slate-700 hover:border-orange-500/50 transition-all p-3"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-white border border-slate-600">
                    {mechanic.provider_name.charAt(0)}
                  </div>
                  {/* Status dot */}
                  <div className={`
                    absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900
                    ${mechanic.is_online ? 'bg-green-500' : 'bg-slate-500'}
                  `} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm truncate">
                    {mechanic.provider_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{mechanic.total_services || 0} services</span>
                    <span>•</span>
                    <span>{mechanic.rating.toFixed(1)} ⭐</span>
                  </div>
                </div>

                {/* Quick Book Button */}
                <button
                  onClick={() => handleQuickBook(mechanic.provider_id, mechanic.is_online)}
                  className={`
                    flex-shrink-0 p-2 rounded-lg transition-colors
                    ${mechanic.is_online
                      ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    }
                  `}
                  title={mechanic.is_online ? 'Book Now' : 'Schedule for Later'}
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All Button (if more than 3) */}
      {favorites.length > 3 && (
        <Link
          href="/customer/my-mechanics"
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
        >
          View {favorites.length - 3} More
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
