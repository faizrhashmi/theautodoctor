'use client'

/**
 * MechanicSelectionCard Component
 * Displays mechanic information with presence indicator and match score
 */

import { Star, MapPin, Award, CheckCircle2 } from 'lucide-react'
import PresenceIndicator from './PresenceIndicator'

export interface MechanicCardData {
  id: string
  name: string
  rating: number
  yearsExperience: number
  isAvailable: boolean
  presenceStatus: 'online' | 'offline' | 'away'
  lastSeenText: string
  isBrandSpecialist: boolean
  brandSpecializations: string[]
  completedSessions: number
  city: string | null
  country: string | null
  matchScore: number
  matchReasons: string[]
  redSealCertified?: boolean
}

interface MechanicSelectionCardProps {
  mechanic: MechanicCardData
  isSelected?: boolean
  onSelect: (mechanicId: string) => void
  showMatchScore?: boolean
}

export default function MechanicSelectionCard({
  mechanic,
  isSelected = false,
  onSelect,
  showMatchScore = true
}: MechanicSelectionCardProps) {
  return (
    <button
      onClick={() => onSelect(mechanic.id)}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all
        ${isSelected
          ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Mechanic info */}
        <div className="flex-1 min-w-0">
          {/* Name and presence */}
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-white truncate">{mechanic.name}</h4>
            {isSelected && (
              <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
            )}
          </div>

          {/* Presence indicator */}
          <div className="mb-2">
            <PresenceIndicator
              status={mechanic.presenceStatus}
              lastSeenText={mechanic.lastSeenText}
              size="sm"
            />
          </div>

          {/* Rating and experience */}
          <div className="flex items-center gap-3 mb-2 text-sm">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{mechanic.rating.toFixed(1)}</span>
            </div>
            <span className="text-slate-400">
              {mechanic.completedSessions} sessions
            </span>
            <span className="text-slate-400">
              {mechanic.yearsExperience} yrs exp
            </span>
          </div>

          {/* Specializations */}
          {mechanic.isBrandSpecialist && mechanic.brandSpecializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {mechanic.brandSpecializations.slice(0, 4).map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-300 rounded"
                >
                  {brand}
                </span>
              ))}
              {mechanic.brandSpecializations.length > 4 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded">
                  +{mechanic.brandSpecializations.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Location */}
          {(mechanic.city || mechanic.country) && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {mechanic.city && mechanic.country
                  ? `${mechanic.city}, ${mechanic.country}`
                  : mechanic.city || mechanic.country}
              </span>
            </div>
          )}

          {/* Certifications */}
          {mechanic.redSealCertified && (
            <div className="flex items-center gap-1.5 text-sm text-blue-400">
              <Award className="h-3.5 w-3.5" />
              <span className="font-medium">Red Seal Certified</span>
            </div>
          )}

          {/* Match reasons */}
          {showMatchScore && mechanic.matchReasons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Why this mechanic:</p>
              <ul className="space-y-0.5">
                {mechanic.matchReasons.slice(0, 3).map((reason, index) => (
                  <li key={index} className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-orange-500 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Match score badge (if shown) */}
        {showMatchScore && (
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-white">{mechanic.matchScore}</div>
              <div className="text-xs text-orange-100">Match</div>
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
