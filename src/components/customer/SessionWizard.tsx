'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Car,
  MessageSquare,
  Video,
  Activity,
  Wrench,
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react'
import { usePlansContext } from '@/contexts/PlansContext'
import CarBrandLogo from '@/components/ui/CarBrandLogo'
import SmartYearSelector from '@/components/intake/SmartYearSelector'
import SmartBrandSelector from '@/components/intake/SmartBrandSelector'
import { createClient } from '@/lib/supabase'

// Lazy load VehiclePrompt component
const VehiclePrompt = lazy(() => import('./VehiclePrompt'))

/**
 * Session Wizard Component
 * Phase 2.2: Simplified 3-step wizard for starting a session
 *
 * Steps:
 * 1. Vehicle Selection (if customer has vehicles)
 * 2. Session Type (Quick/Video/Diagnostic)
 * 3. Specialist Toggle (Standard vs Brand Specialist)
 */

interface Vehicle {
  id: string
  year: number
  make: string
  brand: string
  model: string
  vin?: string
}

interface SessionWizardProps {
  hasUsedFreeSession?: boolean | null
  availableMechanics: number
  preferredMechanicId?: string | null
  routingType?: 'broadcast' | 'priority_broadcast'
  onClose?: () => void
  // Performance: Accept plans from parent to avoid duplicate fetches
  plans?: any[]
  loadingPlans?: boolean
}

type SessionType = 'quick' | 'video' | 'diagnostic' | string
type MechanicType = 'standard' | 'specialist'

// Map plan slugs to icons
const PLAN_ICONS: Record<string, typeof MessageSquare> = {
  free: MessageSquare,
  quick: MessageSquare,
  standard: Video,
  video: Video,
  diagnostic: Activity,
}

export default function SessionWizard({
  hasUsedFreeSession,
  availableMechanics,
  preferredMechanicId,
  routingType = 'broadcast',
  onClose,
  plans: externalPlans,
  loadingPlans: externalLoadingPlans,
}: SessionWizardProps) {
  const router = useRouter()
  // Use external plans if provided, otherwise use cached plans from context
  const { plans: internalPlans, loading: internalLoadingPlans } = usePlansContext()
  const plans = externalPlans || internalPlans
  const loadingPlans = externalLoadingPlans !== undefined ? externalLoadingPlans : internalLoadingPlans

  // Vehicles state - fetched internally
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('standard')
  const [selectedMechanicType, setSelectedMechanicType] = useState<MechanicType>('standard')
  const [launching, setLaunching] = useState(false)

  // Add ref for wizard container to maintain focus
  const wizardRef = useRef<HTMLDivElement>(null)

  // Optimistic submit state
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Add vehicle modal state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    year: '',
    make: '',
    model: '',
    vin: '',
  })
  const supabase = createClient()

  const isNewCustomer = hasUsedFreeSession === false
  const totalSteps = 3 // Always show all 3 steps: Vehicle → Plan → Specialist

  // Memoize filtered plans to prevent unnecessary recalculations
  const availablePlans = useMemo(() => {
    return plans.filter(plan => {
      // For now, only show one-time purchase plans
      // When plan_type is null, assume it's a legacy PAYG plan
      return !plan.planType || plan.planType === 'one_time' || plan.planType === 'payg'
    })
  }, [plans])

  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles()
  }, [])

  // Auto-select default plan when plans load
  useEffect(() => {
    if (availablePlans.length > 0 && !selectedSessionType) {
      // Default to 'standard' if available, otherwise first plan
      const defaultPlan = availablePlans.find(p => p.slug === 'standard') || availablePlans[0]
      setSelectedSessionType(defaultPlan.slug)
    }
  }, [availablePlans.length])

  // Maintain focus on wizard when transitioning between steps
  useEffect(() => {
    if (wizardRef.current) {
      wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentStep])

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true)
      const response = await fetch('/api/customer/vehicles')
      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles || [])

        // Auto-select first vehicle if only one
        if (data.vehicles && data.vehicles.length === 1) {
          setSelectedVehicle(data.vehicles[0].id)
        }
      }
    } catch (error) {
      console.error('[SessionWizard] Error fetching vehicles:', error)
    } finally {
      setLoadingVehicles(false)
    }
  }

  // Memoized event handlers to prevent unnecessary re-renders
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, totalSteps])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleVehicleSelect = useCallback((vehicleId: string) => {
    setSelectedVehicle(vehicleId)
  }, [])

  const handleSessionTypeSelect = useCallback((slug: string) => {
    setSelectedSessionType(slug)
  }, [])

  const handleMechanicTypeSelect = useCallback((type: MechanicType) => {
    setSelectedMechanicType(type)
  }, [])

  const handleAddVehicle = useCallback(async () => {
    if (!newVehicle.year || !newVehicle.make || !newVehicle.model) {
      return
    }

    setAddingVehicle(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: insertedVehicle, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          year: newVehicle.year,
          make: newVehicle.make,
          brand: newVehicle.make,
          model: newVehicle.model,
          vin: newVehicle.vin || null,
          is_primary: vehicles.length === 0,
        })
        .select()
        .single()

      if (error) throw error

      // Refresh vehicles list
      await fetchVehicles()

      // Auto-select the newly added vehicle
      if (insertedVehicle) {
        setSelectedVehicle(insertedVehicle.id)
      }

      // Close modal and reset form
      setShowAddVehicleModal(false)
      setNewVehicle({ year: '', make: '', model: '', vin: '' })
    } catch (error) {
      console.error('[SessionWizard] Error adding vehicle:', error)
    } finally {
      setAddingVehicle(false)
    }
  }, [newVehicle, vehicles.length, supabase, fetchVehicles])

  // Optimistic submit with immediate UI feedback
  const handleLaunchSession = useCallback(() => {
    // Show optimistic success state immediately
    setLaunching(true)
    setSubmitSuccess(true)

    // Build intake URL with params
    const params = new URLSearchParams()
    params.set('plan', selectedSessionType)

    if (selectedMechanicType === 'specialist') {
      params.set('specialist', 'true')
    }

    if (selectedVehicle) {
      params.set('vehicle_id', selectedVehicle)
    }

    if (availableMechanics > 0) {
      params.set('urgent', 'true')
    }

    if (preferredMechanicId) {
      params.set('preferred_mechanic_id', preferredMechanicId)
    }

    if (routingType === 'priority_broadcast') {
      params.set('routing_type', 'priority_broadcast')
    }

    // Handle navigation asynchronously
    const navigationUrl = `/intake?${params.toString()}`

    // Use a small delay to ensure UI updates are visible
    setTimeout(() => {
      router.push(navigationUrl)
    }, 300)
  }, [selectedSessionType, selectedMechanicType, selectedVehicle, availableMechanics, preferredMechanicId, routingType, router])

  const canProceed = useCallback(() => {
    if (currentStep === 1 && vehicles.length > 0) {
      return selectedVehicle !== null
    }
    return true
  }, [currentStep, selectedVehicle, vehicles.length])

  // Render vehicle selection step
  const renderVehicleStep = () => (
    <div className="space-y-3 sm:space-y-4">
      {/* Phase Header */}
      <div className="mb-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
              Phase 1: Session Setup
            </p>
            <p className="text-sm sm:text-base text-white font-bold">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            {currentStep === 1 && 'Next: Choose plan'}
            {currentStep === 2 && 'Next: Choose mechanic'}
            {currentStep === 3 && 'Next: Vehicle details'}
          </p>
        </div>
      </div>

      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">
          Which vehicle needs attention?
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Select the vehicle you'd like to discuss with a mechanic
        </p>
      </div>

      {vehicles.length === 0 ? (
        <Suspense fallback={<div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>}>
          <VehiclePrompt
            variant="session-start"
            onVehicleAdded={fetchVehicles}
          />
        </Suspense>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => handleVehicleSelect(vehicle.id)}
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                  selectedVehicle === vehicle.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      selectedVehicle === vehicle.id ? 'bg-orange-500/20' : 'bg-slate-700/50'
                    }`}
                  >
                    <CarBrandLogo
                      brand={vehicle.make}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-white font-bold text-xs sm:text-sm truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      {selectedVehicle === vehicle.id && (
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{vehicle.brand}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Add New Vehicle Button */}
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="mt-3 w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-orange-500/50 hover:bg-slate-800/50 transition-all text-center"
          >
            <div className="flex items-center justify-center gap-2 text-slate-400 hover:text-orange-400 transition-colors">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">Add Another Vehicle</span>
            </div>
          </button>
        </>
      )}
    </div>
  )

  // Render session type step with VIN decoder
  const renderSessionTypeStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">
          Choose your session type
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          {isNewCustomer
            ? 'Your first session is FREE! Try our Standard Video session for best experience.'
            : 'Select the service level that fits your needs'}
        </p>
      </div>

      {availablePlans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No plans available at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availablePlans.map((plan) => {
            const IconComponent = PLAN_ICONS[plan.slug] || MessageSquare
            const isSelected = selectedSessionType === plan.slug
            // Check if this is the recommended plan (standard/video is usually recommended)
            const isRecommended = plan.slug === 'standard' || plan.slug === 'video'

            return (
              <button
                key={plan.id}
                onClick={() => handleSessionTypeSelect(plan.slug)}
                className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      isSelected ? 'bg-orange-500/20' : 'bg-slate-700/50'
                    }`}
                  >
                    <IconComponent
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-white font-bold text-sm sm:text-base">{plan.name}</h4>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {isNewCustomer ? (
                          <span className="text-xs sm:text-sm font-bold text-green-400">FREE</span>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-white">{plan.price}</span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 break-words">{plan.description}</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 min-w-0">
                      {plan.perks.slice(0, 3).map((perk, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-1.5 sm:px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded break-words"
                        >
                          {perk}
                        </span>
                      ))}
                    </div>
                    {isRecommended && (
                      <div className="mt-1.5 sm:mt-2 text-xs font-medium text-orange-400">
                        ⭐ Recommended
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  // Render mechanic type step
  const renderMechanicTypeStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">
          Standard or Specialist?
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Choose the type of mechanic for your vehicle
        </p>
      </div>

      <div className="space-y-3">
        {/* Standard Mechanic */}
        <button
          onClick={() => handleMechanicTypeSelect('standard')}
          className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
            selectedMechanicType === 'standard'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <div
              className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                selectedMechanicType === 'standard' ? 'bg-orange-500/20' : 'bg-slate-700/50'
              }`}
            >
              <Wrench
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  selectedMechanicType === 'standard' ? 'text-orange-400' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-white font-bold text-sm sm:text-base">Standard Mechanic</h4>
                {selectedMechanicType === 'standard' && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-400 mb-1.5 sm:mb-2">
                Certified mechanics with general automotive expertise
              </p>
              <p className="text-xs sm:text-sm font-bold text-white">Standard pricing</p>
            </div>
          </div>
        </button>

        {/* Brand Specialist */}
        <button
          onClick={() => handleMechanicTypeSelect('specialist')}
          className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
            selectedMechanicType === 'specialist'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <div
              className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                selectedMechanicType === 'specialist' ? 'bg-orange-500/20' : 'bg-slate-700/50'
              }`}
            >
              <Star
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  selectedMechanicType === 'specialist' ? 'text-orange-400' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-white font-bold text-sm sm:text-base">Brand Specialist</h4>
                {selectedMechanicType === 'specialist' && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-400 mb-1.5 sm:mb-2 break-words">
                Experts specialized in your vehicle's make and model
              </p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">+$10 premium</p>
                <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded min-w-0 break-words">
                  BMW • Tesla • +18 brands
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderVehicleStep()
      case 2:
        return renderSessionTypeStep()
      case 3:
        return renderMechanicTypeStep()
      default:
        return null
    }
  }

  // Show loading skeleton while fetching initial data
  if (loadingVehicles || loadingPlans) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 via-slate-850/50 to-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-400" />
          <p className="text-xs sm:text-sm text-slate-400">Preparing your session wizard...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wizardRef}
      className={`w-full max-w-full overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-850/50 to-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-700/50 p-4 sm:p-6 transition-all ${
      submitSuccess ? 'border-green-500/50 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-600/20' : ''
    }`}>
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">
            Step {currentStep} of {totalSteps}
          </span>
          {availableMechanics > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-300">
                {availableMechanics} available now
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx < currentStep
                  ? 'bg-gradient-to-r from-orange-500 to-red-600'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6">{renderCurrentStep()}</div>

      {/* Optimistic Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-300">Session launching...</p>
            <p className="text-xs text-green-300/75">Setting up your session now</p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 sm:gap-3">
        {currentStep > 1 && !submitSuccess && (
          <button
            onClick={handleBack}
            disabled={launching}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm sm:text-base font-medium transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        {currentStep < totalSteps && !submitSuccess ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg text-sm sm:text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : !submitSuccess ? (
          <button
            onClick={handleLaunchSession}
            disabled={launching}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg text-sm sm:text-base font-bold transition-all disabled:opacity-50"
          >
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span className="hidden sm:inline">Launching...</span>
                <span className="sm:hidden">Loading...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{isNewCustomer ? 'Start FREE Session' : `Launch Session`}</span>
                <span className="sm:hidden">{isNewCustomer ? 'Start FREE' : 'Launch'}</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm sm:text-base font-bold">
            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            Ready to go!
          </div>
        )}
      </div>

      {/* Add Vehicle Modal (Rendered via Portal) */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        newVehicle={newVehicle}
        setNewVehicle={setNewVehicle}
        addingVehicle={addingVehicle}
        onSubmit={handleAddVehicle}
      />
    </div>
  )
}

// Add Vehicle Modal Component (Rendered via Portal for Independence)
function AddVehicleModal({
  isOpen,
  onClose,
  newVehicle,
  setNewVehicle,
  addingVehicle,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  newVehicle: { year: string; make: string; model: string; vin: string }
  setNewVehicle: React.Dispatch<React.SetStateAction<{ year: string; make: string; model: string; vin: string }>>
  addingVehicle: boolean
  onSubmit: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ margin: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Add Vehicle</h3>
            <p className="text-xs text-slate-400 mt-1">Quick add without leaving the wizard</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-all hover:rotate-90 duration-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Year Selector */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Year <span className="text-orange-400">*</span>
            </label>
            <SmartYearSelector
              value={newVehicle.year}
              onChange={(year) => setNewVehicle(prev => ({ ...prev, year }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Make/Brand Selector */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Make/Brand <span className="text-orange-400">*</span>
            </label>
            <SmartBrandSelector
              value={newVehicle.make}
              onChange={(make) => setNewVehicle(prev => ({ ...prev, make }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Model Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Model <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={newVehicle.model}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
              placeholder="e.g., Camry, F-150, Model 3"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* VIN Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              VIN <span className="text-slate-500 font-normal text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              value={newVehicle.vin}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
              placeholder="17-character VIN"
              maxLength={17}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
            />
          </div>

          {/* Helper Text */}
          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Car className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-200">
              This vehicle will be saved to your account and automatically selected for your session.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-slate-700 bg-slate-800/50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={addingVehicle}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={addingVehicle || !newVehicle.year || !newVehicle.make || !newVehicle.model}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
          >
            {addingVehicle ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Add Vehicle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
