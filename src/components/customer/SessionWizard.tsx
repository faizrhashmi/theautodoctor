'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
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
  Zap,
} from 'lucide-react'
import { useServicePlans } from '@/hooks/useCustomerPlan'
import CarBrandLogo from '@/components/ui/CarBrandLogo'

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
}

interface DecodedVINData {
  year?: number
  make?: string
  model?: string
  body?: string
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
}: SessionWizardProps) {
  const router = useRouter()
  const { plans, loading: loadingPlans } = useServicePlans()
  const [currentStep, setCurrentStep] = useState(1)
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('standard')
  const [selectedMechanicType, setSelectedMechanicType] = useState<MechanicType>('standard')
  const [launching, setLaunching] = useState(false)

  // Add ref for wizard container to maintain focus
  const wizardRef = useRef<HTMLDivElement>(null)

  // VIN decoding state
  const [vinInput, setVinInput] = useState('')
  const [decodingVin, setDecodingVin] = useState(false)
  const [vinCache, setVinCache] = useState<Record<string, DecodedVINData>>({})
  const [showVinDecoder, setShowVinDecoder] = useState(false)
  const [decodedVinData, setDecodedVinData] = useState<DecodedVINData | null>(null)

  // Optimistic submit state
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isNewCustomer = hasUsedFreeSession === false
  const totalSteps = vehicles.length > 0 ? 3 : 2 // Skip vehicle step if no vehicles

  // Memoize filtered plans to prevent unnecessary recalculations
  const availablePlans = useMemo(() => {
    return plans.filter(plan => {
      // For now, only show one-time purchase plans
      // When plan_type is null, assume it's a legacy PAYG plan
      return !plan.planType || plan.planType === 'one_time' || plan.planType === 'payg'
    })
  }, [plans])

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

  // Lazy VIN lookup - only decode when user clicks the button
  const decodeVin = useCallback(async (vin: string) => {
    if (!vin || vin.length < 3) {
      setSubmitError('VIN must be at least 3 characters')
      return
    }

    // Check cache first
    if (vinCache[vin]) {
      setDecodedVinData(vinCache[vin])
      setSubmitError(null)
      return
    }

    setDecodingVin(true)
    setSubmitError(null)

    try {
      // Call VIN decoding API
      // Note: You may need to create this endpoint or use a third-party VIN decoder
      const response = await fetch('/api/vehicles/decode-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      })

      if (response.ok) {
        const data = await response.json()
        const decodedData: DecodedVINData = {
          year: data.year,
          make: data.make,
          model: data.model,
          body: data.body,
        }

        // Cache the result
        setVinCache(prev => ({ ...prev, [vin]: decodedData }))
        setDecodedVinData(decodedData)
      } else {
        setSubmitError('Could not decode VIN. Please check and try again.')
        setDecodedVinData(null)
      }
    } catch (error) {
      console.error('[SessionWizard] Error decoding VIN:', error)
      setSubmitError('Error decoding VIN. Please try again.')
      setDecodedVinData(null)
    } finally {
      setDecodingVin(false)
    }
  }, [vinCache])

  // Memoized event handlers to prevent unnecessary re-renders
  const handleNext = useCallback(() => {
    // Skip vehicle step if no vehicles
    if (currentStep === 1 && vehicles.length === 0) {
      setCurrentStep(2)
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, totalSteps, vehicles.length])

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => handleVehicleSelect(vehicle.id)}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                selectedVehicle === vehicle.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                    selectedVehicle === vehicle.id ? 'bg-blue-500/20' : 'bg-slate-700/50'
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
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{vehicle.brand}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
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

      {/* VIN Decoder Section */}
      <div className="p-3 sm:p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
          <h4 className="text-xs sm:text-sm font-semibold text-white">Optional: Decode VIN</h4>
        </div>
        <p className="text-xs text-slate-400 mb-2 sm:mb-3">
          Help us identify your vehicle details for faster diagnosis
        </p>
        {!showVinDecoder ? (
          <button
            onClick={() => setShowVinDecoder(true)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
          >
            Decode VIN
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter 17-digit VIN"
                maxLength={17}
                className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-slate-700/50 text-white placeholder-slate-500 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none break-words"
              />
              <button
                onClick={() => decodeVin(vinInput)}
                disabled={decodingVin || !vinInput}
                className="px-3 py-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {decodingVin ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : 'Decode'}
              </button>
            </div>
            {submitError && (
              <p className="text-xs text-red-400">{submitError}</p>
            )}
            {decodedVinData && (
              <div className="text-xs text-green-400 p-2 bg-green-500/10 rounded break-words">
                <p className="font-semibold break-words">Decoded: {decodedVinData.year} {decodedVinData.make} {decodedVinData.model}</p>
              </div>
            )}
          </div>
        )}
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
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  <div
                    className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      isSelected ? 'bg-blue-500/20' : 'bg-slate-700/50'
                    }`}
                  >
                    <IconComponent
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}
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
                        {isSelected && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />}
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
                      <div className="mt-1.5 sm:mt-2 text-xs font-medium text-blue-400">
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
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <div
              className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                selectedMechanicType === 'standard' ? 'bg-blue-500/20' : 'bg-slate-700/50'
              }`}
            >
              <Wrench
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  selectedMechanicType === 'standard' ? 'text-blue-400' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-white font-bold text-sm sm:text-base">Standard Mechanic</h4>
                {selectedMechanicType === 'standard' && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
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
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <div
              className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                selectedMechanicType === 'specialist' ? 'bg-blue-500/20' : 'bg-slate-700/50'
              }`}
            >
              <Star
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  selectedMechanicType === 'specialist' ? 'text-blue-400' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-white font-bold text-sm sm:text-base">Brand Specialist</h4>
                {selectedMechanicType === 'specialist' && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
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
    // Adjust step numbers if skipping vehicle step
    const effectiveStep = vehicles.length === 0 ? currentStep + 1 : currentStep

    switch (effectiveStep) {
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
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-400" />
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
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700'
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
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm sm:text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : !submitSuccess ? (
          <button
            onClick={handleLaunchSession}
            disabled={launching}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm sm:text-base font-bold transition-all disabled:opacity-50"
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
    </div>
  )
}
