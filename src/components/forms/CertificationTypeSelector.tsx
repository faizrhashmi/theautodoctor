'use client'

import { Shield, Award, CheckCircle, Star, Wrench } from 'lucide-react'
import type { CertificationType } from '@/lib/certifications/certTypes'

interface CertificationTypeSelectorProps {
  value: CertificationType | ''
  onChange: (type: CertificationType | '') => void
  label?: string
  required?: boolean
}

const CERTIFICATION_OPTIONS = [
  {
    value: 'red_seal' as CertificationType,
    label: 'Red Seal (Interprovincial)',
    description: 'Nationally recognized interprovincial certification',
    icon: Shield,
    gradient: 'from-red-500 to-red-600',
  },
  {
    value: 'provincial' as CertificationType,
    label: 'Provincial Journeyman',
    description: 'Provincial automotive service technician',
    icon: Award,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    value: 'ase' as CertificationType,
    label: 'ASE Certified',
    description: 'Automotive Service Excellence (USA)',
    icon: CheckCircle,
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    value: 'cpa_quebec' as CertificationType,
    label: 'CPA Quebec',
    description: 'Corporation des maîtres mécaniciens',
    icon: Star,
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    value: 'manufacturer' as CertificationType,
    label: 'Manufacturer Specialist',
    description: 'Brand-specific certification (Honda, Toyota, etc.)',
    icon: Wrench,
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    value: 'other' as CertificationType,
    label: 'Other Professional Certification',
    description: 'Other recognized automotive certification',
    icon: Shield,
    gradient: 'from-slate-500 to-slate-600',
  },
]

export default function CertificationTypeSelector({
  value,
  onChange,
  label = 'Certification Type',
  required = false,
}: CertificationTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-white">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {CERTIFICATION_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? `border-transparent bg-gradient-to-br ${option.gradient} shadow-lg`
                  : 'border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br ' + option.gradient + ' opacity-70 group-hover:opacity-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-white'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white'}`}>
                    {option.label}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isSelected ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  >
                    {option.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="absolute right-3 top-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {!value && required && (
        <p className="text-xs text-slate-400">Please select your certification type to continue</p>
      )}
    </div>
  )
}
