'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, AlertCircle, Check, ChevronDown, ChevronUp, Building2, Users, Star } from 'lucide-react'

interface PlanTier {
  id: string
  name: string
  price: string
  priceValue: number
  duration: string
  description: string
  perks: string[]
  recommendedFor: string
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

interface SessionLauncherProps {
  accountType?: string
  hasUsedFreeSession?: boolean | null
  isB2CCustomer?: boolean
  availableMechanics: number
  workshopId?: string | null
  organizationId?: string | null
}

const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free Session',
    price: '$0',
    priceValue: 0,
    duration: 'Up to 5 minute chat',
    description: 'Try AskAutoDoctor with a short text-only session.',
    perks: [
      'Text chat with a mechanic',
      'Share one photo or video clip',
      'Quick first impressions and advice',
    ],
    recommendedFor: 'Use when you want to sample the platform or ask a quick yes/no question.',
  },
  {
    id: 'quick',
    name: 'Quick Chat',
    price: '$9.99',
    priceValue: 9.99,
    duration: '30 minute live chat',
    description: 'Fast triage over private chat with a certified mechanic.',
    perks: [
      'Direct chat for photos, videos, and codes',
      'Action plan delivered before chat ends',
      'Great for warning lights or quick questions',
    ],
    recommendedFor: 'Ideal when you need quick reassurance or guidance.',
  },
  {
    id: 'standard',
    name: 'Standard Video',
    price: '$29.99',
    priceValue: 29.99,
    duration: '45 minute video session',
    description: 'Live video consultation to walk through complex issues.',
    perks: [
      'HD video with screen sharing',
      'Step-by-step troubleshooting and next steps',
      'Recording link after the call',
    ],
    recommendedFor: 'Perfect for noises, leaks, or guided inspections.',
  },
  {
    id: 'diagnostic',
    name: 'Full Diagnostic',
    price: '$49.99',
    priceValue: 49.99,
    duration: '60 minute video deep-dive',
    description: 'Comprehensive video session with written diagnostic report.',
    perks: [
      'Advanced testing walkthroughs',
      'Multi-system coverage in one call',
      'Summary email with repair roadmap',
    ],
    recommendedFor: 'Best for recurring issues or pre-purchase inspections.',
  },
]

export default function SessionLauncher({
  accountType,
  hasUsedFreeSession,
  isB2CCustomer,
  availableMechanics,
  workshopId,
  organizationId,
}: SessionLauncherProps) {
  const [showCustomization, setShowCustomization] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('free')
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [loadingWorkshops, setLoadingWorkshops] = useState(false)
  const startButtonRef = useRef<HTMLAnchorElement>(null)

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

  // Render different UI based on account type
  const renderB2CCustomer = () => {
    const isNewCustomer = hasUsedFreeSession === false
    const defaultPlan = PLAN_TIERS.find(p => p.id === selectedPlan)

    return (
      <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl border border-orange-500/30 p-6">
        {/* Header with availability */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
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

        {/* Main CTA */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isNewCustomer ? '🎁 Get Your FREE First Session!' : '⚡ Start Your Session'}
          </h2>
          <p className="text-slate-300 text-sm">
            {isNewCustomer
              ? 'Try AskAutoDoctor risk-free! Connect with a certified mechanic in under 2 minutes.'
              : 'Connect with a certified mechanic instantly. Choose your service level below.'}
          </p>
        </div>

        {/* Quick Start or Customization */}
        <div className="space-y-4">
          {/* Primary CTA with customization toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              ref={startButtonRef}
              href={`/intake?plan=${selectedPlan}${availableMechanics > 0 ? '&urgent=true' : ''}`}
              className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <AlertCircle className="h-5 w-5" />
              <span>
                {isNewCustomer
                  ? 'Start FREE Session'
                  : `Start ${defaultPlan?.name || 'Session'}`}
              </span>
              {!isNewCustomer && defaultPlan && (
                <span className="text-sm opacity-90">{defaultPlan.price}</span>
              )}
            </Link>

            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-800/70 border border-slate-600 text-white rounded-xl font-medium hover:bg-slate-700/70 transition-all"
            >
              <span>Choose Plan</span>
              {showCustomization ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Expanded Customization Options */}
          {showCustomization && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-5 animate-in slide-in-from-top-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Select Service Plan</h3>
              <div className="space-y-3">
                {PLAN_TIERS.map((tier) => {
                  // Hide free option for returning customers unless admin override
                  if (tier.id === 'free' && hasUsedFreeSession === true) {
                    return null
                  }

                  const isSelected = tier.id === selectedPlan
                  return (
                    <button
                      key={tier.id}
                      onClick={() => {
                        setSelectedPlan(tier.id)
                        setShowCustomization(false)
                        // Focus the start button after collapse
                        setTimeout(() => {
                          startButtonRef.current?.focus()
                        }, 100)
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-bold">{tier.name}</h4>
                          <p className="text-xs text-slate-400">{tier.duration}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-white">{tier.price}</span>
                          {isSelected && <Check className="h-5 w-5 text-orange-400" />}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{tier.description}</p>
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
