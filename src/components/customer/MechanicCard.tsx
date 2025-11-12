'use client'

/**
 * Mechanic Card Component
 * Phase 2: SessionWizard Redesign
 *
 * Beautiful card showing mechanic details with online status
 */

import { Star, MapPin, Award, Clock, Eye, Briefcase, Calendar, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
  isFavorite?: boolean // Whether this mechanic is already favorited
}

interface MechanicCardProps {
  mechanic: MechanicCardData
  onSelect: (mechanicId: string) => void
  onViewProfile: (mechanicId: string) => void
  isSelected?: boolean
  showSpecialistPremium?: boolean // DEPRECATED: Use specialistPremiumAmount instead
  specialistPremiumAmount?: number // Dynamic premium amount for brand specialists
  showScheduleButton?: boolean // ✅ NEW: Show "Schedule for Later" button
  showFavoriteButton?: boolean // ✅ NEW: Show "Add to Favorites" button
  wizardData?: any // Pass wizard data for context pre-filling
  onFavoriteChange?: (mechanicId: string, isFavorite: boolean) => void // Callback when favorite status changes
}

export default function MechanicCard({
  mechanic,
  onSelect,
  onViewProfile,
  isSelected,
  showSpecialistPremium,
  specialistPremiumAmount,
  showScheduleButton,
  showFavoriteButton = true, // Default to showing favorite button
  wizardData,
  onFavoriteChange
}: MechanicCardProps) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(mechanic.isFavorite || false)
  const [isFavoriting, setIsFavoriting] = useState(false)

  // Determine if we should show premium badge
  const shouldShowPremium = mechanic.isBrandSpecialist && (specialistPremiumAmount || showSpecialistPremium)
  const premiumAmount = specialistPremiumAmount || 15 // Default to $15 if not specified

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

  // ✅ NEW: Handle "Schedule for Later" button click
  const handleScheduleForLater = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Store context for SchedulingWizard
    const schedulingContext = {
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      mechanicType: mechanic.isBrandSpecialist ? 'brand_specialist' : 'standard',
      vehicleId: wizardData?.vehicleId,
      vehicleName: wizardData?.vehicleName, // ✅ ISSUE #6: Include vehicle name for banner
      planType: wizardData?.planType,
      source: 'booking_wizard_mechanic_card',
      timestamp: new Date().toISOString()
    }
    sessionStorage.setItem('schedulingContext', JSON.stringify(schedulingContext))

    // Navigate to scheduling page
    router.push('/customer/schedule')
  }

  // ✅ NEW: Handle favorite toggle
  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isFavoriting) return

    setIsFavoriting(true)

    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/customer/mechanics/favorites?mechanic_id=${mechanic.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setIsFavorite(false)
          onFavoriteChange?.(mechanic.id, false)
          // Optional: Show success message
          console.log('Removed from favorites')
        } else {
          const error = await response.json()
          console.error('Remove favorites error:', error)
          alert(`Failed to remove from favorites: ${error.error || 'Unknown error'}`)
        }
      } else {
        // Add to favorites
        console.log('Adding to favorites:', { mechanic_id: mechanic.id, mechanic_name: mechanic.name })

        const response = await fetch('/api/customer/mechanics/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mechanic_id: mechanic.id,
            mechanic_name: mechanic.name
          })
        })

        console.log('Add favorites response status:', response.status)
        const responseData = await response.json()
        console.log('Add favorites response data:', responseData)

        if (response.ok) {
          setIsFavorite(true)
          onFavoriteChange?.(mechanic.id, true)
          console.log('Successfully added to favorites')
        } else {
          console.error('Add favorites error:', responseData)
          alert(`Failed to add to favorites: ${responseData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert(`Failed to update favorites: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsFavoriting(false)
    }
  }

  return (
    <div
      className={`
        relative rounded-lg border transition-all duration-200
        ${isSelected
          ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
        }
        p-3 cursor-pointer
      `}
      onClick={() => onSelect(mechanic.id)}
    >
      {/* Top Right Corner: Status Badge & Favorite Heart */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {/* Favorite Button */}
        {showFavoriteButton && (
          <button
            onClick={handleFavoriteToggle}
            disabled={isFavoriting}
            className={`
              p-1.5 rounded-full transition-all duration-200
              ${isFavorite
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-red-400'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`}
            />
          </button>
        )}

        {/* Status Badge */}
        <div className={`
          px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap
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

      {/* Header: Avatar + Details */}
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
        <div className="flex-1 min-w-0 pr-32">
          {/* Name and Red Seal Badge Row */}
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-white truncate">
              {mechanic.name}
            </h3>
            {mechanic.redSealCertified && (
              <Award className="h-4 w-4 text-blue-400 flex-shrink-0" title="Red Seal Certified" />
            )}
            {/* Specialist Premium Badge - inline with name */}
            {shouldShowPremium && (
              <div className="px-2 py-0.5 bg-orange-500 text-white rounded text-sm font-semibold flex-shrink-0">
                +${premiumAmount.toFixed(0)}
              </div>
            )}
          </div>

          {/* Workshop Name */}
          {mechanic.workshopName && (
            <div className="flex items-center gap-1.5 mt-1">
              <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-400 truncate">{mechanic.workshopName}</span>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-base font-medium text-white">{mechanic.rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-slate-400">
              ({mechanic.completedSessions})
            </span>
          </div>

          {/* Experience + Location */}
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{mechanic.yearsExperience}y exp</span>
            </div>
            {mechanic.city && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
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
                  className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded text-sm font-medium border border-blue-500/20"
                >
                  {brand}
                </span>
              ))}
              {mechanic.brandSpecializations.length > 2 && (
                <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-sm">
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
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-700/50">
        {/* ✅ NEW: Schedule for Later button (when mechanic is offline) */}
        {showScheduleButton && mechanic.presenceStatus !== 'online' && (
          <button
            onClick={handleScheduleForLater}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm font-medium transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule for Later with {mechanic.name.split(' ')[0]}
          </button>
        )}

        <div className="flex gap-2">
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
            disabled={mechanic.presenceStatus !== 'online'}
            className={`
              flex-1 px-3 py-2 rounded text-sm font-medium transition-colors
              ${mechanic.presenceStatus !== 'online'
                ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : isSelected
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }
            `}
            title={mechanic.presenceStatus !== 'online' ? 'Mechanic is offline - Use "Schedule for Later" instead' : ''}
          >
            {mechanic.presenceStatus !== 'online'
              ? '🔴 Offline'
              : isSelected ? '✓ Selected' : 'Select'
            }
          </button>
        </div>
      </div>

      {/* Selection indicator - moved to left to avoid overlap */}
      {isSelected && (
        <div className="absolute top-2 left-2">
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
