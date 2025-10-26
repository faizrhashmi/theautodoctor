/**
 * Specialist Tier Badge Component
 * Visual indicator for mechanic specialist tiers
 */

import { Wrench, Star, Crown } from 'lucide-react'

export type SpecialistTier = 'general' | 'brand' | 'master'

interface SpecialistTierBadgeProps {
  tier: SpecialistTier
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showLabel?: boolean
  showPrice?: boolean
  className?: string
}

const tierConfig = {
  general: {
    label: 'General',
    fullLabel: 'General Mechanic',
    icon: Wrench,
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    iconColor: 'text-slate-500',
    price: '$29.99',
    description: 'All vehicle types and brands'
  },
  brand: {
    label: 'Brand Specialist',
    fullLabel: 'Brand Specialist',
    icon: Star,
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    iconColor: 'text-orange-500',
    price: '$49.99',
    description: 'Specialized brand expertise'
  },
  master: {
    label: 'Master Tech',
    fullLabel: 'Master Technician',
    icon: Crown,
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    iconColor: 'text-purple-500',
    price: 'Premium',
    description: 'Advanced certifications'
  }
}

const sizeConfig = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    icon: 'h-3 w-3',
    gap: 'gap-1'
  },
  md: {
    text: 'text-sm',
    padding: 'px-3 py-1',
    icon: 'h-4 w-4',
    gap: 'gap-1.5'
  },
  lg: {
    text: 'text-base',
    padding: 'px-4 py-2',
    icon: 'h-5 w-5',
    gap: 'gap-2'
  }
}

export function SpecialistTierBadge({
  tier,
  size = 'md',
  showIcon = true,
  showLabel = true,
  showPrice = false,
  className = ''
}: SpecialistTierBadgeProps) {
  const config = tierConfig[tier]
  const sizing = sizeConfig[size]
  const Icon = config.icon

  return (
    <div
      className={`
        inline-flex items-center ${sizing.gap} ${sizing.padding} ${sizing.text}
        ${config.bgColor} ${config.textColor} border ${config.borderColor}
        rounded-full font-medium
        ${className}
      `}
    >
      {showIcon && <Icon className={`${sizing.icon} ${config.iconColor}`} />}
      {showLabel && <span>{size === 'sm' ? config.label : config.fullLabel}</span>}
      {showPrice && (
        <span className="font-semibold">
          • {config.price}
        </span>
      )}
    </div>
  )
}

/**
 * Compact version for small spaces (cards, lists)
 */
export function SpecialistTierBadgeCompact({ tier }: { tier: SpecialistTier }) {
  return (
    <SpecialistTierBadge
      tier={tier}
      size="sm"
      showIcon={true}
      showLabel={true}
      showPrice={false}
    />
  )
}

/**
 * Full version with price for pricing displays
 */
export function SpecialistTierBadgeFull({ tier }: { tier: SpecialistTier }) {
  return (
    <SpecialistTierBadge
      tier={tier}
      size="lg"
      showIcon={true}
      showLabel={true}
      showPrice={true}
    />
  )
}

/**
 * Detailed tier card for selection interfaces
 */
interface TierCardProps {
  tier: SpecialistTier
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function SpecialistTierCard({
  tier,
  selected = false,
  onClick,
  disabled = false
}: TierCardProps) {
  const config = tierConfig[tier]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-4 rounded-lg border-2 text-left transition-all
        ${selected
          ? `${config.borderColor} ${config.bgColor}`
          : 'border-slate-200 bg-white hover:border-slate-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className={`h-6 w-6 ${config.iconColor}`} />
        {selected && (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Selected</span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-slate-900 mb-1">
        {config.fullLabel}
      </h3>

      <p className="text-sm text-slate-600 mb-2">
        {config.description}
      </p>

      <div className={`text-lg font-bold ${config.textColor}`}>
        {config.price}
        {tier !== 'master' && <span className="text-sm font-normal text-slate-500"> /session</span>}
      </div>
    </button>
  )
}

/**
 * Helper to get tier configuration
 */
export function getTierConfig(tier: SpecialistTier) {
  return tierConfig[tier]
}

/**
 * Helper to get price value
 */
export function getTierPrice(tier: SpecialistTier): number | null {
  switch (tier) {
    case 'general':
      return 29.99
    case 'brand':
      return 49.99
    case 'master':
      return null // Premium pricing TBD
    default:
      return 29.99
  }
}
