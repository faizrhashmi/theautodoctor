'use client'

/**
 * FavoriteMechanicCard - Reusable card component for displaying favorite mechanics
 * Used in: Dashboard card, My Mechanics page
 */

import { Star, MapPin, Award, Clock, Briefcase, Heart, Zap, Calendar } from 'lucide-react'

export interface FavoriteMechanic {
  id: string
  provider_id: string
  provider_name: string
  provider_type: string
  total_services: number
  total_spent: number
  last_service_at: string | null
  years_experience: number
  rating: number
  completed_sessions: number
  red_seal_certified: boolean
  brand_specializations: string[]
  city?: string
  country?: string
  mechanic_type?: string // Computed display value, not from database column
  can_perform_physical_work?: boolean
  workshop_name?: string
  is_online: boolean
  last_seen?: string
  presence_status: 'online' | 'offline' | 'away'
}

interface FavoriteMechanicCardProps {
  mechanic: FavoriteMechanic
  onBook?: (mechanicId: string) => void
  onSchedule?: (mechanicId: string) => void
  onRemove?: (mechanicId: string) => void
  showActions?: boolean
  compact?: boolean
}

export default function FavoriteMechanicCard({
  mechanic,
  onBook,
  onSchedule,
  onRemove,
  showActions = true,
  compact = false
}: FavoriteMechanicCardProps) {
  const statusColor = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-slate-500'
  }[mechanic.presence_status]

  const statusRingColor = {
    online: 'ring-green-400/50',
    away: 'ring-yellow-400/50',
    offline: 'ring-slate-400/50'
  }[mechanic.presence_status]

  const lastSeenText = mechanic.presence_status === 'online'
    ? 'Online Now'
    : mechanic.last_seen
    ? `Last seen ${new Date(mechanic.last_seen).toLocaleDateString()}`
    : 'Offline'

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 hover:border-orange-500/50 transition-all p-4">
      {/* Header: Avatar + Status + Favorite Icon */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-base font-bold text-white border border-slate-600">
            {mechanic.provider_name.charAt(0)}
          </div>
          {/* Online status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColor} border-2 border-slate-900 ring-2 ${statusRingColor}`} />
        </div>

        {/* Name + Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-1.5 truncate">
            {mechanic.provider_name}
            {mechanic.red_seal_certified && (
              <span title="Red Seal Certified">
                <Award className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              </span>
            )}
          </h3>

          {/* Workshop Name */}
          {mechanic.workshop_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Briefcase className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{mechanic.workshop_name}</span>
            </div>
          )}

          {/* Rating + Experience */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-medium">{mechanic.rating.toFixed(1)}</span>
              <span>({mechanic.completed_sessions})</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{mechanic.years_experience}y exp</span>
            </div>
          </div>
        </div>

        {/* Favorite Heart Icon */}
        <Heart className="w-5 h-5 text-red-400 fill-current flex-shrink-0" />
      </div>

      {/* Location + Specializations (if not compact) */}
      {!compact && (
        <>
          {/* Location */}
          {mechanic.city && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{mechanic.city}, {mechanic.country}</span>
            </div>
          )}

          {/* Specializations */}
          {mechanic.brand_specializations && mechanic.brand_specializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {mechanic.brand_specializations.slice(0, 3).map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded text-xs font-medium border border-blue-500/20"
                >
                  {brand}
                </span>
              ))}
              {mechanic.brand_specializations.length > 3 && (
                <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs">
                  +{mechanic.brand_specializations.length - 3}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-slate-700/50">
        <div>
          <div className="text-xs text-slate-400 mb-1">Services</div>
          <div className="text-white font-semibold">{mechanic.total_services || 0}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Total Spent</div>
          <div className="text-white font-semibold">${(mechanic.total_spent || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Last Service */}
      {mechanic.last_service_at && (
        <div className="text-xs text-slate-500 mb-3">
          Last service: {new Date(mechanic.last_service_at).toLocaleDateString()}
        </div>
      )}

      {/* Status Badge */}
      <div className={`
        px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center mb-3
        ${mechanic.presence_status === 'online'
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
        }
      `}>
        {lastSeenText}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="space-y-2">
          {/* Book Now (if online) */}
          {mechanic.is_online && onBook && (
            <button
              onClick={() => onBook(mechanic.provider_id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all"
            >
              <Zap className="w-4 h-4" />
              Book Now
            </button>
          )}

          {/* Schedule for Later (if offline) */}
          {!mechanic.is_online && onSchedule && (
            <button
              onClick={() => onSchedule(mechanic.provider_id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule for Later
            </button>
          )}

          {/* Remove from Favorites */}
          {onRemove && (
            <button
              onClick={() => onRemove(mechanic.provider_id)}
              className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Remove from favorites
            </button>
          )}
        </div>
      )}
    </div>
  )
}
