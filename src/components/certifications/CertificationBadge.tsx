/**
 * Certification Badge Component
 *
 * Displays certification badges with appropriate styling for each type.
 * Supports all certification types: Red Seal, Provincial, ASE, CPA Quebec, Manufacturer, Other.
 *
 * Usage:
 * ```tsx
 * import { CertificationBadge } from '@/components/certifications/CertificationBadge'
 *
 * <CertificationBadge type="red_seal" />
 * <CertificationBadge type="provincial" />
 * <CertificationBadge type="ase" />
 * ```
 */

'use client'

import { Shield, Award, Wrench, Star, CheckCircle } from 'lucide-react'
import type { CertificationType } from '@/lib/certifications'

interface CertificationBadgeProps {
  /** Type of certification */
  type: CertificationType

  /** Size variant */
  size?: 'sm' | 'md' | 'lg'

  /** Display style */
  variant?: 'badge' | 'card' | 'minimal'

  /** Show certification number */
  number?: string | null

  /** Show full details (authority, region) */
  showDetails?: boolean

  /** Additional authority text */
  authority?: string | null

  /** Additional region text */
  region?: string | null
}

/**
 * Get badge configuration for each certification type
 */
function getBadgeConfig(type: CertificationType) {
  const configs = {
    red_seal: {
      label: 'Red Seal',
      fullLabel: 'Red Seal Certified',
      description: 'Interprovincial Certificate of Qualification',
      icon: Shield,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-500/10 to-red-600/10',
      borderColor: 'border-red-500/30',
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
    },
    provincial: {
      label: 'Provincial',
      fullLabel: 'Provincial Journeyperson',
      description: 'Provincial Certificate of Qualification',
      icon: Award,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    ase: {
      label: 'ASE',
      fullLabel: 'ASE Certified',
      description: 'Automotive Service Excellence',
      icon: CheckCircle,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-500/10 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
    },
    cpa_quebec: {
      label: 'CPA Quebec',
      fullLabel: 'CPA Quebec Certified',
      description: 'Corporation des Maîtres Mécaniciens',
      icon: Star,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-500/10 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
    },
    manufacturer: {
      label: 'Specialist',
      fullLabel: 'Manufacturer Specialist',
      description: 'Brand-specific certification',
      icon: Wrench,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-500/10 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
    },
    other: {
      label: 'Certified',
      fullLabel: 'Certified Technician',
      description: 'Recognized certification',
      icon: Shield,
      gradient: 'from-slate-500 to-slate-600',
      bgGradient: 'from-slate-500/10 to-slate-600/10',
      borderColor: 'border-slate-500/30',
      iconColor: 'text-slate-400',
      iconBg: 'bg-slate-500/20',
    },
  }

  return configs[type]
}

/**
 * Get size classes for different size variants
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-4 w-4',
      iconContainer: 'h-6 w-6',
      text: 'text-xs',
      description: 'text-[10px]',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-5 w-5',
      iconContainer: 'h-8 w-8',
      text: 'text-sm',
      description: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-6 w-6',
      iconContainer: 'h-10 w-10',
      text: 'text-base',
      description: 'text-sm',
    },
  }

  return sizes[size]
}

export default function CertificationBadge({
  type,
  size = 'md',
  variant = 'badge',
  number,
  showDetails = false,
  authority,
  region,
}: CertificationBadgeProps) {
  const config = getBadgeConfig(type)
  const sizeClasses = getSizeClasses(size)
  const Icon = config.icon

  // Simple badge (inline, no card)
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border ${config.borderColor} bg-gradient-to-r ${config.bgGradient} ${sizeClasses.container}`}
      >
        <Icon className={`${sizeClasses.icon} ${config.iconColor}`} />
        <span className={`font-semibold ${sizeClasses.text} text-white`}>
          {config.label}
        </span>
        {number && (
          <span className={`${sizeClasses.description} text-slate-400`}>
            #{number}
          </span>
        )}
      </div>
    )
  }

  // Minimal variant (icon + text, no background)
  if (variant === 'minimal') {
    return (
      <div className="inline-flex items-center gap-2">
        <div className={`flex ${sizeClasses.iconContainer} items-center justify-center rounded-full ${config.iconBg}`}>
          <Icon className={`${sizeClasses.icon} ${config.iconColor}`} />
        </div>
        <div>
          <p className={`font-semibold ${sizeClasses.text} text-white`}>
            {config.fullLabel}
          </p>
          {showDetails && (authority || region) && (
            <p className={`${sizeClasses.description} text-slate-400`}>
              {authority}
              {authority && region && ' • '}
              {region}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Card variant (full details)
  return (
    <div
      className={`rounded-xl border-2 ${config.borderColor} bg-gradient-to-r ${config.bgGradient} p-4`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex ${sizeClasses.iconContainer} items-center justify-center rounded-full ${config.iconBg}`}>
          <Icon className={`${sizeClasses.icon} ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className={`font-bold ${sizeClasses.text} text-white`}>
            {config.fullLabel}
          </p>
          <p className={`${sizeClasses.description} text-slate-400`}>
            {config.description}
          </p>
          {showDetails && (authority || region || number) && (
            <div className={`mt-1 ${sizeClasses.description} text-slate-300`}>
              {number && <div>Certificate: {number}</div>}
              {authority && <div>Authority: {authority}</div>}
              {region && <div>Region: {region}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Multi-badge component - shows multiple certification badges
 *
 * Usage:
 * ```tsx
 * <CertificationBadges certifications={[
 *   { type: 'red_seal', number: 'RS-ON-12345' },
 *   { type: 'manufacturer', authority: 'Honda Master' }
 * ]} />
 * ```
 */
interface Certification {
  type: CertificationType
  number?: string | null
  authority?: string | null
  region?: string | null
}

interface CertificationBadgesProps {
  certifications: Certification[]
  size?: 'sm' | 'md' | 'lg'
  variant?: 'badge' | 'card' | 'minimal'
  showDetails?: boolean
}

export function CertificationBadges({
  certifications,
  size = 'md',
  variant = 'badge',
  showDetails = false,
}: CertificationBadgesProps) {
  if (certifications.length === 0) return null

  return (
    <div className={variant === 'card' ? 'space-y-3' : 'flex flex-wrap gap-2'}>
      {certifications.map((cert, idx) => (
        <CertificationBadge
          key={`${cert.type}-${idx}`}
          type={cert.type}
          number={cert.number}
          authority={cert.authority}
          region={cert.region}
          size={size}
          variant={variant}
          showDetails={showDetails}
        />
      ))}
    </div>
  )
}
