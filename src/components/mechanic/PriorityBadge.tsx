'use client'

/**
 * PriorityBadge - Display match priority and reasons for session assignments
 *
 * Shows:
 * - Match score badge (High/Medium/Low priority)
 * - Match reasons tooltip
 * - Visual indicators for targeted vs broadcast assignments
 */

import { useState } from 'react'
import { Star, MapPin, Award, Zap, Info } from 'lucide-react'

interface PriorityBadgeProps {
  matchScore?: number | null
  matchReasons?: string[] | null
  priority?: string | null
  metadata?: {
    match_type?: 'targeted' | 'broadcast'
    is_brand_specialist?: boolean
    is_local_match?: boolean
    [key: string]: any
  } | null
  className?: string
}

export default function PriorityBadge({
  matchScore,
  matchReasons,
  priority,
  metadata,
  className = ''
}: PriorityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Determine if this is a targeted assignment
  const isTargeted = metadata?.match_type === 'targeted'
  const isBroadcast = metadata?.match_type === 'broadcast'

  // If no match data, show generic broadcast badge
  if (!isTargeted || !matchScore) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30 ${className}`}>
        <Info className="h-3.5 w-3.5" />
        <span>General Queue</span>
      </div>
    )
  }

  // Determine priority level from score
  const getPriorityConfig = (score: number) => {
    if (score >= 150) {
      return {
        label: 'High Match',
        bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        borderColor: 'border-orange-400/50',
        textColor: 'text-white',
        icon: Zap,
        glowClass: 'shadow-lg shadow-orange-500/30'
      }
    } else if (score >= 100) {
      return {
        label: 'Good Match',
        bgColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
        borderColor: 'border-green-400/50',
        textColor: 'text-white',
        icon: Star,
        glowClass: 'shadow-md shadow-green-500/20'
      }
    } else {
      return {
        label: 'Standard',
        bgColor: 'bg-slate-600',
        borderColor: 'border-slate-500/30',
        textColor: 'text-slate-200',
        icon: Info,
        glowClass: ''
      }
    }
  }

  const config = getPriorityConfig(matchScore)
  const Icon = config.icon

  // Format match reasons for display
  const formattedReasons = matchReasons || []
  const hasReasons = formattedReasons.length > 0

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Main Badge */}
      <button
        onMouseEnter={() => hasReasons && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => hasReasons && setShowTooltip(!showTooltip)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
          border transition-all
          ${config.bgColor} ${config.borderColor} ${config.textColor} ${config.glowClass}
          ${hasReasons ? 'cursor-help hover:scale-105' : 'cursor-default'}
        `}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{config.label}</span>
        {matchScore && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-bold">
            {matchScore}
          </span>
        )}
      </button>

      {/* Tooltip with Match Reasons */}
      {showTooltip && hasReasons && (
        <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 animate-in fade-in duration-150">
          <div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-orange-400" />
            Why you're a great match:
          </div>
          <ul className="space-y-1.5">
            {formattedReasons.map((reason, idx) => {
              // Determine icon based on reason content
              let reasonIcon = <Star className="h-3 w-3 text-slate-400" />
              if (reason.toLowerCase().includes('local') || reason.toLowerCase().includes('city') || reason.toLowerCase().includes('postal')) {
                reasonIcon = <MapPin className="h-3 w-3 text-blue-400" />
              } else if (reason.toLowerCase().includes('certified') || reason.toLowerCase().includes('specialist')) {
                reasonIcon = <Award className="h-3 w-3 text-yellow-400" />
              } else if (reason.toLowerCase().includes('available') || reason.toLowerCase().includes('online')) {
                reasonIcon = <Zap className="h-3 w-3 text-green-400" />
              }

              return (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="flex-shrink-0 mt-0.5">{reasonIcon}</span>
                  <span>{reason}</span>
                </li>
              )
            })}
          </ul>

          {/* Additional Metadata */}
          {(metadata?.is_brand_specialist || metadata?.is_local_match) && (
            <div className="mt-3 pt-2 border-t border-slate-700 flex flex-wrap gap-1.5">
              {metadata.is_brand_specialist && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Award className="h-2.5 w-2.5" />
                  Brand Specialist
                </span>
              )}
              {metadata.is_local_match && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <MapPin className="h-2.5 w-2.5" />
                  Local
                </span>
              )}
            </div>
          )}

          {/* Tooltip Arrow */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45" />
        </div>
      )}
    </div>
  )
}
