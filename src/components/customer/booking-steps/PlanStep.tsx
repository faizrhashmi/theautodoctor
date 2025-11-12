'use client'

/**
 * Step 2: Plan Selection
 * Shows plan cards with pricing - DYNAMICALLY from database
 */

import { useState, useEffect } from 'react'
import { Check, Zap, Clock, Search, Gift, Crown } from 'lucide-react'
import { usePlansContext } from '@/contexts/PlansContext'
import { createClient } from '@/lib/supabase'

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
  const supabase = createClient()
  const { plans, loading } = usePlansContext()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(wizardData.planType)
  const [specialistPremium, setSpecialistPremium] = useState<number>(0)
  const [acceptedSpecialistPremium, setAcceptedSpecialistPremium] = useState(false)
  const [favoriteMechanicData, setFavoriteMechanicData] = useState<{
    id: string
    name: string
    isBrandSpecialist: boolean
    certifiedBrands: string[]
    specialistPremium: number
  } | null>(null)

  // Fetch specialist premium from database
  useEffect(() => {
    async function fetchSpecialistPremium() {
      // Source 1: User came from specialists page
      if (wizardData.requestedBrand) {
        const { data: brand } = await supabase
          .from('brand_specializations')
          .select('specialist_premium')
          .eq('brand_name', wizardData.requestedBrand)
          .single()

        if (brand?.specialist_premium) {
          setSpecialistPremium(brand.specialist_premium)
        }
      }

      // Source 2: User selected favorite specialist
      else if (wizardData.mechanicId && wizardData.mechanicType === 'favorite') {
        const { data: mechanic } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            certifications (
              brand,
              certification_type
            )
          `)
          .eq('id', wizardData.mechanicId)
          .single()

        if (mechanic && mechanic.certifications && mechanic.certifications.length > 0) {
          const certifiedBrands = mechanic.certifications.map((c: any) => c.brand)

          // Get premium for first certified brand
          const { data: brand } = await supabase
            .from('brand_specializations')
            .select('specialist_premium')
            .eq('brand_name', certifiedBrands[0])
            .single()

          const premium = brand?.specialist_premium || 15

          setFavoriteMechanicData({
            id: mechanic.id,
            name: mechanic.full_name,
            isBrandSpecialist: true,
            certifiedBrands,
            specialistPremium: premium
          })

          setSpecialistPremium(premium)
        }
      }
    }

    fetchSpecialistPremium()
  }, [wizardData.requestedBrand, wizardData.mechanicId, wizardData.mechanicType])

  const handlePlanSelect = (planId: string) => {
    const planData = plans.find((p) => p.id === planId || p.slug === planId)
    if (!planData) return

    setSelectedPlan(planId)

    // Clear specialist premium if free plan selected
    const isFree = planId === 'free' || planData.priceValue === 0

    onComplete({
      planType: planId,
      planPrice: planData.priceValue,
      specialistPremium: isFree ? 0 : specialistPremium,
      specialistPremiumAccepted: isFree ? false : acceptedSpecialistPremium,
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

      {/* Specialist Pricing Breakdown */}
      {selectedPlan && (wizardData.requestedBrand || favoriteMechanicData) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Pricing Summary</h3>
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-slate-300">
              <span>{plans.find(p => p.id === selectedPlan || p.slug === selectedPlan)?.name || 'Plan'}</span>
              <span>${(plans.find(p => p.id === selectedPlan || p.slug === selectedPlan)?.priceValue || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-orange-300">
              <span>
                {wizardData.requestedBrand
                  ? `${wizardData.requestedBrand} Specialist Premium`
                  : `${favoriteMechanicData?.certifiedBrands[0]} Specialist Premium (${favoriteMechanicData?.name})`
                }
              </span>
              <span>+${specialistPremium.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
              <span>Total</span>
              <span>${((plans.find(p => p.id === selectedPlan || p.slug === selectedPlan)?.priceValue || 0) + specialistPremium).toFixed(2)} CAD</span>
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/15 transition-colors">
            <input
              type="checkbox"
              checked={acceptedSpecialistPremium}
              onChange={(e) => setAcceptedSpecialistPremium(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-orange-500 bg-slate-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
              required
            />
            <span className="text-sm text-slate-200">
              I understand {favoriteMechanicData?.name ? `${favoriteMechanicData.name} is` : 'there is'} a{' '}
              <strong>{wizardData.requestedBrand || favoriteMechanicData?.certifiedBrands[0]}</strong>{' '}
              specialist with an additional <strong>${specialistPremium.toFixed(2)}</strong> premium,
              and I agree to this charge.
            </span>
          </label>

          {/* Option to Switch */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              💡 Want a standard mechanic instead? You can change in the next step (Mechanic Selection).
            </p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-slate-400 mt-8">
        Not sure which plan to choose? Start with the {plans.find(p => p.id === 'free' || p.slug === 'free') ? 'Free Session to try it out, or the ' : ''} Standard Session - you can always upgrade during your consultation.
      </div>
    </div>
  )
}
