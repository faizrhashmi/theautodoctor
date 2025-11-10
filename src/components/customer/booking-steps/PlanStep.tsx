'use client'

/**
 * Step 2: Plan Selection
 * Shows plan cards with pricing - DYNAMICALLY from database
 */

import { useState } from 'react'
import { Check, Zap, Clock, Search, Gift } from 'lucide-react'
import { usePlansContext } from '@/contexts/PlansContext'

interface PlanStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

// Icon mapping for plans
const PLAN_ICONS: Record<string, any> = {
  free: Gift,
  quick: Zap,
  standard: Clock,
  diagnostic: Search,
}

// Color mapping for plans
const PLAN_COLORS: Record<string, string> = {
  free: 'green',
  quick: 'blue',
  standard: 'orange',
  diagnostic: 'purple',
}

export default function PlanStep({ wizardData, onComplete }: PlanStepProps) {
  const { plans, loading } = usePlansContext()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(wizardData.planType)

  const handlePlanSelect = (planId: string) => {
    const planData = plans.find((p) => p.id === planId || p.slug === planId)
    if (!planData) return

    setSelectedPlan(planId)
    onComplete({
      planType: planId,
      planPrice: planData.priceValue,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading plans...</p>
        </div>
      </div>
    )
  }

  const colorClasses: Record<string, any> = {
    green: {
      border: 'border-green-500',
      bg: 'from-green-500/10 via-green-500/5',
      shadow: 'shadow-green-500/20',
      icon: 'bg-green-500/20 text-green-400',
      badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    blue: {
      border: 'border-blue-500',
      bg: 'from-blue-500/10 via-blue-500/5',
      shadow: 'shadow-blue-500/20',
      icon: 'bg-blue-500/20 text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    orange: {
      border: 'border-orange-500',
      bg: 'from-orange-500/10 via-orange-500/5',
      shadow: 'shadow-orange-500/20',
      icon: 'bg-orange-500/20 text-orange-400',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    purple: {
      border: 'border-purple-500',
      bg: 'from-purple-500/10 via-purple-500/5',
      shadow: 'shadow-purple-500/20',
      icon: 'bg-purple-500/20 text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Choose Your Service Plan</h3>
        <p className="text-slate-400">Select the consultation length that fits your needs</p>
      </div>

      {/* Plan Cards - Dynamic from Database */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id || selectedPlan === plan.slug
          const Icon = PLAN_ICONS[plan.id] || PLAN_ICONS[plan.slug] || Clock
          const colorKey = PLAN_COLORS[plan.id] || PLAN_COLORS[plan.slug] || 'blue'
          const colors = colorClasses[colorKey]

          return (
            <button
              key={plan.id}
              onClick={() => handlePlanSelect(plan.id)}
              className={`
                relative rounded-lg border p-3 transition-all text-left
                ${isSelected
                  ? `${colors.border} bg-gradient-to-br ${colors.bg} to-transparent shadow-lg ${colors.shadow}`
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
                }
              `}
            >
              {/* Icon */}
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${isSelected ? colors.icon : 'bg-slate-700/50'}`}>
                <Icon className={`h-4 w-4 ${isSelected ? '' : 'text-slate-400'}`} />
              </div>

              {/* Title & Duration */}
              <h4 className="font-semibold text-white text-sm mb-0.5">{plan.name}</h4>
              <p className="text-xs text-slate-400 mb-2">{plan.duration}</p>

              {/* Price */}
              <div className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold mb-2 ${isSelected ? colors.badge : 'bg-slate-700/50 text-slate-300 border-slate-600/30'}`}>
                {plan.priceValue === 0 ? 'FREE' : `$${plan.priceValue.toFixed(2)} CAD`}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 mb-2 line-clamp-2">{plan.description}</p>

              {/* Perks */}
              <ul className="space-y-1">
                {plan.perks.slice(0, 3).map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <Check className={`h-3 w-3 flex-shrink-0 mt-0.5 ${isSelected ? 'text-green-400' : 'text-slate-500'}`} />
                    <span className="line-clamp-1">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className={`w-5 h-5 rounded-full ${colors.border.replace('border-', 'bg-')} flex items-center justify-center`}>
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}

              {/* Popular Badge for Standard */}
              {(plan.id === 'standard' || plan.slug === 'standard') && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-slate-400 mt-8">
        Not sure which plan to choose? Start with the {plans.find(p => p.id === 'free' || p.slug === 'free') ? 'Free Session to try it out, or the ' : ''} Standard Session - you can always upgrade during your consultation.
      </div>
    </div>
  )
}
