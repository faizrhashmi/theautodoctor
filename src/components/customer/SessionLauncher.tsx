'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, AlertCircle, Check, ChevronDown, ChevronUp, Building2, Users, Star, Loader2, Wrench, CreditCard, Heart } from 'lucide-react'
import { useServicePlans } from '@/hooks/useCustomerPlan'

interface PlanTier {
  id: string
  slug: string
  name: string
  price: string
  priceValue: number
  duration: string
  durationMinutes: number
  description: string
  perks: string[]
  recommendedFor: string
  stripePriceId: string | null
  features?: Record<string, boolean>
  planCategory?: 'basic' | 'premium' | 'enterprise'
  routingPreference?: 'any' | 'general' | 'brand_specialist'
  restrictedBrands?: string[]
}

interface Workshop {
  workshop_id: string
  workshop_name: string
  workshop_email: string
  workshop_status: string
  total_mechanics: number
  available_mechanics: number
  avg_rating: number | null
  total_sessions: number
  created_at: string
}

interface CreditPricing {
  session_type: string
  is_specialist: boolean
  credit_cost: number
}

interface Subscription {
  id: string
  current_credits: number
  status: string
  plan: {
    name: string
    discount_percent: number
  }
}

interface SessionLauncherProps {
  accountType?: string
  hasUsedFreeSession?: boolean | null
  isB2CCustomer?: boolean
  availableMechanics: number
  workshopId?: string | null
  organizationId?: string | null
  // Phase 2: Favorites Priority Flow
  preferredMechanicId?: string | null
  preferredMechanicName?: string | null
  routingType?: 'broadcast' | 'priority_broadcast'
}

export default function SessionLauncher({
  accountType,
  hasUsedFreeSession,
  isB2CCustomer,
  availableMechanics,
  workshopId,
  organizationId,
  preferredMechanicId = null,
  preferredMechanicName = null,
  routingType = 'broadcast',
}: SessionLauncherProps) {
  // Fetch plans from API
  const { plans: PLAN_TIERS, loading: loadingPlans, error: plansError } = useServicePlans()

  const [showCustomization, setShowCustomization] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('free')
  const [specialistMode, setSpecialistMode] = useState(false)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [loadingWorkshops, setLoadingWorkshops] = useState(false)
  const startButtonRef = useRef<HTMLAnchorElement>(null)

  // Subscription & Credit State
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [creditPricing, setCreditPricing] = useState<CreditPricing[]>([])
  const [loadingSubscription, setLoadingSubscription] = useState(false)

  // Determine default plan based on account type
  useEffect(() => {
    if (isB2CCustomer) {
      if (hasUsedFreeSession === false) {
        setSelectedPlan('free')
      } else {
        setSelectedPlan('quick') // Default to $9.99 for returning customers
      }
    }
  }, [hasUsedFreeSession, isB2CCustomer])

  // Fetch workshop directory for B2B2C customers
  useEffect(() => {
    async function fetchWorkshops() {
      if (accountType === 'workshop_member' || accountType === 'workshop_owner') {
        setLoadingWorkshops(true)
        try {
          const response = await fetch('/api/workshops/directory')
          if (response.ok) {
            const data = await response.json()
            setWorkshops(data.workshops || [])

            // Pre-select customer's workshop if they have one
            if (workshopId && data.workshops) {
              const customerWorkshop = data.workshops.find((w: Workshop) => w.workshop_id === workshopId)
              if (customerWorkshop) {
                setSelectedWorkshop(customerWorkshop.workshop_id)
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch workshops:', error)
        } finally {
          setLoadingWorkshops(false)
        }
      }
    }
    fetchWorkshops()
  }, [accountType, workshopId])

  // Fetch subscription and credit pricing for B2C customers
  useEffect(() => {
    async function fetchSubscriptionData() {
      if (!isB2CCustomer) return

      setLoadingSubscription(true)
      try {
        // Fetch subscription
        const subRes = await fetch('/api/customer/subscriptions')
        if (subRes.ok) {
          const subData = await subRes.json()
          if (subData.has_subscription) {
            setSubscription(subData.subscription)
          }
        }

        // Fetch credit pricing
        const pricingRes = await fetch('/api/credit-pricing')
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json()
          setCreditPricing(pricingData.pricing || [])
        }
      } catch (error) {
        console.error('Failed to fetch subscription data:', error)
      } finally {
        setLoadingSubscription(false)
      }
    }
    fetchSubscriptionData()
  }, [isB2CCustomer])

  // Helper function to get session type from plan slug
  const getSessionType = (planSlug: string): string => {
    // Map plan slugs to session types
    if (planSlug === 'quick' || planSlug === 'free') return 'quick'
    if (planSlug === 'video') return 'video'
    if (planSlug === 'diagnostic') return 'diagnostic'
    return 'quick' // default
  }

  // Helper function to calculate credit cost for current selection
  const getCreditCost = (): number | null => {
    if (!subscription || creditPricing.length === 0) return null

    const sessionType = getSessionType(selectedPlan)
    const pricing = creditPricing.find(
      p => p.session_type === sessionType && p.is_specialist === specialistMode
    )
    return pricing ? pricing.credit_cost : null
  }

  // Check if user has enough credits
  const hasEnoughCredits = (): boolean => {
    if (!subscription) return false
    const cost = getCreditCost()
    if (cost === null) return false
    return subscription.current_credits >= cost
  }

  // Render different UI based on account type
  const renderB2CCustomer = () => {
    const isNewCustomer = hasUsedFreeSession === false
    const defaultPlan = PLAN_TIERS.find(p => p.slug === selectedPlan || p.id === selectedPlan)
    const creditCost = getCreditCost()
    const canUseCredits = subscription && creditCost !== null && hasEnoughCredits()

    // Loading state
    if (loadingPlans) {
      return (
        <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl border border-orange-500/30 p-6">
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
            <span className="text-slate-300">Loading service plans...</span>
          </div>
        </div>
      )
    }

    // Error state
    if (plansError || PLAN_TIERS.length === 0) {
      return (
        <div className="bg-gradient-to-r from-red-600/20 via-orange-600/20 to-red-600/20 backdrop-blur-sm rounded-2xl border border-red-500/30 p-6">
          <div className="flex items-center justify-center gap-3 py-12 text-center">
            <div>
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-slate-300 mb-2">Unable to load service plans</p>
              <p className="text-sm text-slate-400">{plansError || 'No plans available'}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl border border-orange-500/30 p-4 sm:p-6">
        {/* Header with availability */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
          {availableMechanics > 0 ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
                <Zap className="h-3 w-3 text-green-400" />
                <span className="text-xs font-semibold text-green-300">{availableMechanics} mechanic{availableMechanics > 1 ? 's' : ''} available NOW</span>
              </div>
              {isNewCustomer && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
                  <span className="text-xs font-bold text-green-300 uppercase tracking-wider">🎁 FREE TRIAL</span>
                </div>
              )}
              {!isNewCustomer && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-400/30">
                  <span className="text-xs font-bold text-orange-300 uppercase tracking-wider">⚡ EXPRESS SERVICE</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-400/30">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-xs font-semibold text-yellow-300">All mechanics busy - you'll be queued</span>
            </div>
          )}
        </div>

        {/* Priority Banner (Favorites Priority Flow - Phase 2) */}
        {routingType === 'priority_broadcast' && preferredMechanicName && (
          <div className="mb-3 sm:mb-4 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg shrink-0">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400 fill-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm sm:text-base mb-1">
                  Booking with {preferredMechanicName}
                </p>
                <p className="text-xs sm:text-sm text-pink-200">
                  Your favorite mechanic will be notified first and has 10 minutes to accept. If unavailable, we'll automatically find you another certified mechanic.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Credit Balance Banner */}
        {subscription && !isNewCustomer && (
          <div className="mb-3 sm:mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">
                    {subscription.plan.name} - {subscription.current_credits} credits
                  </p>
                  <p className="text-xs text-blue-300">
                    Save {subscription.plan.discount_percent}% on all sessions
                  </p>
                </div>
              </div>
              {creditCost !== null && (
                <div className="text-xs sm:text-sm">
                  {canUseCredits ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-400/30 font-medium">
                      ✓ {creditCost} credits will be used
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-400/30 font-medium">
                      ⚠ Need {creditCost} credits (low balance)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main CTA */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2">
            {isNewCustomer ? '🎁 Get Your FREE First Session!' : '⚡ Start Your Session'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            {isNewCustomer
              ? 'Try AskAutoDoctor risk-free! Connect with a certified mechanic in under 2 minutes.'
              : 'Connect with a certified mechanic instantly. Choose your service level below.'}
          </p>
        </div>

        {/* Quick Start or Customization */}
        <div className="space-y-3 sm:space-y-4">
          {/* Primary CTA with customization toggle */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Link
              ref={startButtonRef}
              href={`/intake?plan=${selectedPlan}${specialistMode ? '&specialist=true' : ''}${availableMechanics > 0 ? '&urgent=true' : ''}${canUseCredits ? '&use_credits=true' : ''}${preferredMechanicId ? `&preferred_mechanic_id=${preferredMechanicId}` : ''}${routingType === 'priority_broadcast' ? '&routing_type=priority_broadcast' : ''}`}
              className="flex-1 inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-base sm:text-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              {canUseCredits ? (
                <CreditCard className="h-5 w-5" />
              ) : specialistMode ? (
                <Star className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="truncate">
                {isNewCustomer
                  ? 'Start FREE Session'
                  : canUseCredits
                  ? `Use ${creditCost} Credits`
                  : `Start ${specialistMode ? 'Specialist ' : ''}${defaultPlan?.name || 'Session'}`}
              </span>
              {!isNewCustomer && !canUseCredits && defaultPlan && (
                <span className="text-xs sm:text-sm opacity-90 shrink-0">{defaultPlan.price}</span>
              )}
            </Link>

            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-800/70 border border-slate-600 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-slate-700/70 transition-all shrink-0"
            >
              <span>Choose Plan</span>
              {showCustomization ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Expanded Customization Options */}
          {showCustomization && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-5 animate-in slide-in-from-top-2">
              {/* Mechanic Type Selector */}
              <div className="mb-4 sm:mb-5">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2.5 sm:mb-3 uppercase tracking-wider">Choose Mechanic Type</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {/* Standard Mechanic Option */}
                  <button
                    onClick={() => setSpecialistMode(false)}
                    className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                      !specialistMode
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className={`p-2 rounded-lg ${!specialistMode ? 'bg-orange-500/20' : 'bg-slate-700/50'}`}>
                        <Wrench className={`h-4 w-4 sm:h-5 sm:w-5 ${!specialistMode ? 'text-orange-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-white font-bold text-sm sm:text-base">Standard Mechanic</h4>
                          {!specialistMode && <Check className="h-4 w-4 text-orange-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 mb-1">General automotive expertise</p>
                        <p className="text-xs sm:text-sm font-semibold text-white">From $9.99</p>
                      </div>
                    </div>
                  </button>

                  {/* Brand Specialist Option */}
                  <button
                    onClick={() => setSpecialistMode(true)}
                    className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                      specialistMode
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className={`p-2 rounded-lg ${specialistMode ? 'bg-orange-500/20' : 'bg-slate-700/50'}`}>
                        <Star className={`h-4 w-4 sm:h-5 sm:w-5 ${specialistMode ? 'text-orange-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-white font-bold text-sm sm:text-base">Brand Specialist</h4>
                          {specialistMode && <Check className="h-4 w-4 text-orange-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 mb-1">BMW • Tesla • Mercedes • +17 more</p>
                        <p className="text-xs sm:text-sm font-semibold text-white">From $29.99</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <h3 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2.5 sm:mb-3 uppercase tracking-wider">Select Service Plan</h3>
              <div className="space-y-2.5 sm:space-y-3">
                {PLAN_TIERS.map((tier) => {
                  // Hide free option for returning customers unless admin override
                  if (tier.slug === 'free' && hasUsedFreeSession === true) {
                    return null
                  }

                  const isSelected = tier.slug === selectedPlan || tier.id === selectedPlan

                  // Calculate credit cost for this tier
                  const tierSessionType = getSessionType(tier.slug || tier.id)
                  const tierCreditPricing = creditPricing.find(
                    p => p.session_type === tierSessionType && p.is_specialist === specialistMode
                  )
                  const tierCreditCost = tierCreditPricing ? tierCreditPricing.credit_cost : null

                  return (
                    <button
                      key={tier.slug || tier.id}
                      onClick={() => {
                        setSelectedPlan(tier.slug || tier.id)
                        setShowCustomization(false)
                        // Focus the start button after collapse
                        setTimeout(() => {
                          startButtonRef.current?.focus()
                        }, 100)
                      }}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5 sm:mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-sm sm:text-base truncate">{tier.name}</h4>
                          <p className="text-xs text-slate-400">{tier.duration}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {subscription && tierCreditCost !== null ? (
                              <span className="text-sm sm:text-base font-bold text-blue-300">
                                {tierCreditCost} credits
                              </span>
                            ) : (
                              <span className="text-lg sm:text-xl font-bold text-white">{tier.price}</span>
                            )}
                            {isSelected && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />}
                          </div>
                          {subscription && tierCreditCost !== null && (
                            <span className="text-xs text-slate-500 line-through">{tier.price}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 mb-1.5 sm:mb-2 line-clamp-2">{tier.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {tier.perks.slice(0, 2).map((perk, idx) => (
                          <span key={idx} className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                            ✓ {perk}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Subtle link to full pricing page */}
              <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-700 space-y-2">
                <Link
                  href="/onboarding/pricing"
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  View detailed plan comparison
                  <ChevronDown className="h-3 w-3" />
                </Link>
                {!subscription && !isNewCustomer && (
                  <Link
                    href="/customer/plans"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 font-medium"
                  >
                    💳 Save with monthly subscriptions
                    <ChevronDown className="h-3 w-3" />
                  </Link>
                )}
                {subscription && (
                  <Link
                    href="/customer/plans"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 font-medium"
                  >
                    Manage subscription
                    <ChevronDown className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderWorkshopMember = () => {
    return (
      <div className="bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
            <Building2 className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">WORKSHOP PACKAGE</span>
          </div>
          {availableMechanics > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-xs font-semibold text-green-300">{availableMechanics} mechanic{availableMechanics > 1 ? 's' : ''} available NOW</span>
            </div>
          )}
        </div>

        {/* Main CTA */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">🔧 Use Your Workshop Package Session</h2>
          <p className="text-slate-300 text-sm">
            Connect with a mechanic from your preferred workshop network.
          </p>
        </div>

        {/* Workshop Selection */}
        <div className="space-y-4">
          <div>
            <label htmlFor="workshop-select" className="block text-sm font-medium text-slate-300 mb-2">
              Select Workshop
            </label>
            {loadingWorkshops ? (
              <div className="text-center py-4 text-slate-400">Loading workshops...</div>
            ) : workshops.length > 0 ? (
              <select
                id="workshop-select"
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/70 border border-slate-600 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Select a workshop...</option>
                {workshops.map((workshop) => (
                  <option key={workshop.workshop_id} value={workshop.workshop_id}>
                    {workshop.workshop_name} ({workshop.available_mechanics} available)
                    {workshop.avg_rating ? ` - ${workshop.avg_rating.toFixed(1)}★` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center py-4 text-slate-400">No workshops available</div>
            )}
          </div>

          {/* Selected Workshop Info */}
          {selectedWorkshop && (() => {
            const workshop = workshops.find(w => w.workshop_id === selectedWorkshop)
            if (!workshop) return null

            return (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-bold">{workshop.workshop_name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {workshop.total_mechanics} mechanic{workshop.total_mechanics > 1 ? 's' : ''}
                      </span>
                      {workshop.avg_rating && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {workshop.avg_rating.toFixed(1)} rating
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-300">{workshop.available_mechanics} online</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* CTA */}
          <Link
            href={`/intake?type=workshop&workshop_id=${selectedWorkshop}${availableMechanics > 0 ? '&urgent=true' : ''}`}
            className={`w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
              selectedWorkshop
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 hover:shadow-xl hover:scale-105'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
            onClick={(e) => {
              if (!selectedWorkshop) {
                e.preventDefault()
              }
            }}
          >
            <Building2 className="h-5 w-5" />
            <span>Connect to Workshop Mechanic</span>
          </Link>
        </div>
      </div>
    )
  }

  const renderCorporateFleet = () => {
    return (
      <div className="bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30">
            <Building2 className="h-3 w-3 text-blue-400" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">COMPANY ACCOUNT</span>
          </div>
          {availableMechanics > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-xs font-semibold text-green-300">{availableMechanics} mechanic{availableMechanics > 1 ? 's' : ''} available NOW</span>
            </div>
          )}
        </div>

        {/* Main CTA */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">🏢 Use Company Session Credit</h2>
          <p className="text-slate-300 text-sm">
            Connect with a mechanic using your company's pre-paid session credits.
          </p>
        </div>

        {/* CTA */}
        <Link
          href={`/intake?type=corporate${organizationId ? `&org_id=${organizationId}` : ''}${availableMechanics > 0 ? '&urgent=true' : ''}`}
          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Building2 className="h-5 w-5" />
          <span>Start Company Session</span>
        </Link>
      </div>
    )
  }

  // Route to correct UI based on account type
  if (accountType === 'corporate' || accountType === 'fleet') {
    return renderCorporateFleet()
  } else if (accountType === 'workshop_member' || accountType === 'workshop_owner') {
    return renderWorkshopMember()
  } else {
    // Default to B2C
    return renderB2CCustomer()
  }
}
