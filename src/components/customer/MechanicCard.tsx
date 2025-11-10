'use client'

/**
 * Mechanic Card Component
 * Phase 2: SessionWizard Redesign
 *
 * Beautiful card showing mechanic details with online status
 */

import { Star, MapPin, Award, Clock, Eye, Briefcase } from 'lucide-react'

export interface MechanicCardData {
  id: string
  userId?: string
  name: string
  rating: number
  yearsExperience: number
  isAvailable: boolean
  presenceStatus: 'online' | 'offline' | 'away'
  lastSeenText: string
  isBrandSpecialist: boolean
  brandSpecializations: string[]
  city?: string
  country?: string
  completedSessions: number
  redSealCertified: boolean
  workshopName?: string | null
  matchScore?: number
  matchReasons?: string[]
}

interface MechanicCardProps {
  mechanic: MechanicCardData
  onSelect: (mechanicId: string) => void
  onViewProfile: (mechanicId: string) => void
  isSelected?: boolean
  showSpecialistPremium?: boolean // Show +$15 badge for specialists in Favorites
}

export default function MechanicCard({ mechanic, onSelect, onViewProfile, isSelected, showSpecialistPremium }: MechanicCardProps) {
  const statusColor = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-slate-500'
  }[mechanic.presenceStatus]

  const statusRingColor = {
    online: 'ring-green-400/50',
    away: 'ring-yellow-400/50',
    offline: 'ring-slate-400/50'
  }[mechanic.presenceStatus]

  return (
    <div
      className={`
        relative rounded-lg border transition-all duration-200
        ${isSelected
          ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
        }
        p-4 cursor-pointer
      `}
      onClick={() => onSelect(mechanic.id)}
    >
      {/* Specialist Premium Badge */}
      {showSpecialistPremium && mechanic.isBrandSpecialist && (
        <div className="absolute top-3 right-3">
          <div className="px-2 py-1 bg-orange-500 text-white rounded-md text-xs font-semibold shadow-lg">
            +$15
          </div>
        </div>
      )}

      {/* Header: Avatar + Status */}
      <div className="flex items-start gap-3">
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-base font-bold text-white border border-slate-600">
            {mechanic.name.charAt(0)}
          </div>
          {/* Online status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColor} border-2 border-slate-800 ring-2 ${statusRingColor}`} />
        </div>

        {/* Name + Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                {mechanic.name}
                {mechanic.redSealCertified && (
                  <Award className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" title="Red Seal Certified" />
                )}
              </h3>

              {/* Workshop Name */}
              {mechanic.workshopName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Briefcase className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 truncate">{mechanic.workshopName}</span>
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium text-white">{mechanic.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-slate-400">
                  ({mechanic.completedSessions})
                </span>
              </div>
            </div>

            {/* Status badge */}
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
              ${mechanic.presenceStatus === 'online'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : mechanic.presenceStatus === 'away'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
              }
            `}>
              {mechanic.presenceStatus === 'online' ? 'Online' : mechanic.lastSeenText}
            </div>
          </div>

          {/* Experience + Location */}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{mechanic.yearsExperience}y exp</span>
            </div>
            {mechanic.city && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{mechanic.city}</span>
              </div>
            )}
          </div>

          {/* Specializations */}
          {mechanic.brandSpecializations && mechanic.brandSpecializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mechanic.brandSpecializations.slice(0, 2).map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded text-xs font-medium border border-blue-500/20"
                >
                  {brand}
                </span>
              ))}
              {mechanic.brandSpecializations.length > 2 && (
                <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs">
                  +{mechanic.brandSpecializations.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Match reasons */}
          {mechanic.matchReasons && mechanic.matchReasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {mechanic.matchReasons.slice(0, 1).map((reason, idx) => (
                <span
                  key={idx}
                  className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 truncate"
                >
                  ✓ {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewProfile(mechanic.userId || mechanic.id)
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-sm font-medium transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <button
          onClick={() => onSelect(mechanic.id)}
          className={`
            flex-1 px-3 py-2 rounded text-sm font-medium transition-colors
            ${isSelected
              ? 'bg-orange-500 text-white'
              : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }
          `}
        >
          {isSelected ? '✓ Selected' : 'Select'}
        </button>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
