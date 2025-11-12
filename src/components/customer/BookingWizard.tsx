'use client'

/**
 * BookingWizard - 4-Step Booking Flow
 * Replaces SessionWizard with modern UI
 *
 * Steps:
 * 1. Vehicle Selection
 * 2. Plan Selection
 * 3. Mechanic Selection
 * 4. Concern Description
 *
 * Then submits to /api/intake/start
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronRight, ChevronLeft, Car, DollarSign, UserCheck, FileText, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Step components
import VehicleStep from './booking-steps/VehicleStep'
import PlanStep from './booking-steps/PlanStep'
import MechanicStep from './booking-steps/MechanicStep'
import ConcernStep from './booking-steps/ConcernStep'
import BookingGuide from './BookingGuide'

interface BookingWizardProps {
  onComplete?: (sessionId: string) => void
  onCancel?: () => void
}

interface StepConfig {
  id: number
  title: string
  icon: any
  component: any
}

interface StepConfigWithTooltip extends StepConfig {
  tooltip: string
}

const STEPS: StepConfigWithTooltip[] = [
  { id: 1, title: 'Vehicle', icon: Car, component: VehicleStep, tooltip: 'Select or add the vehicle you need help with' },
  { id: 2, title: 'Plan', icon: DollarSign, component: PlanStep, tooltip: 'Choose a service plan that fits your needs' },
  { id: 3, title: 'Mechanic', icon: UserCheck, component: MechanicStep, tooltip: 'Find and select your preferred mechanic' },
  { id: 4, title: 'Concern', icon: FileText, component: ConcernStep, tooltip: 'Describe the issue you need help with' },
]

export default function BookingWizard({ onComplete, onCancel }: BookingWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const specialistBrandFromUrl = searchParams.get('specialist')

  // Restore wizard state from sessionStorage if available
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingWizardStep')
      return saved ? parseInt(saved) : 1
    }
    return 1
  })

  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingWizardCompletedSteps')
      const wizardDataStr = sessionStorage.getItem('bookingWizardData')

      if (saved && wizardDataStr) {
        const steps = JSON.parse(saved)
        const data = JSON.parse(wizardDataStr)

        // ✅ Validate each completed step has required data
        const validatedSteps = steps.filter((stepId: number) => {
          if (stepId === 1) {
            // Step 1: Vehicle (unless advice-only)
            return data.isAdviceOnly || data.vehicleId
          }
          if (stepId === 2) {
            // Step 2: Plan - ✅ FIX: Accept any valid plan slug
            return data.planType && typeof data.planType === 'string' && data.planType.trim().length > 0
          }
          if (stepId === 3) {
            // Step 3: Mechanic
            return data.mechanicId && data.mechanicPresenceStatus === 'online'
          }
          if (stepId === 4) {
            // Step 4: Concern
            return data.concernDescription && data.concernDescription.length >= 10
          }
          return false
        })

        return validatedSteps
      }
    }
    return []
  })

  const [wizardData, setWizardData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bookingWizardData')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {
      vehicleId: null as string | null,
      vehicleName: '',
      planType: null as string | null,
      planPrice: 0,
      mechanicId: null as string | null,
      mechanicName: '',
      mechanicType: 'standard' as 'standard' | 'brand_specialist' | 'favorite',
      requestedBrand: null as string | null,
      country: '',
      province: '',
      city: '',
      postalCode: '',
      primaryConcern: '',
      concernCategory: '',
      concernDescription: '',
      isUrgent: false,
      uploadedFiles: [] as string[],
    }
  })

  // Fetch customer profile to pre-fill location
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/customer/profile')
        if (response.ok) {
          const data = await response.json()
          setWizardData(prev => ({
            ...prev,
            country: data.profile.country || '',
            province: data.profile.province || '',
            city: data.profile.city || '',
            postalCode: data.profile.postal_code || '',
          }))
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      }
    }
    fetchProfile()
  }, [])

  // Detect specialist request from URL
  useEffect(() => {
    if (specialistBrandFromUrl && !wizardData.requestedBrand) {
      setWizardData(prev => ({
        ...prev,
        mechanicType: 'brand_specialist',
        requestedBrand: specialistBrandFromUrl
      }))
    }
  }, [specialistBrandFromUrl])

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  // Save wizard state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bookingWizardStep', currentStep.toString())
      sessionStorage.setItem('bookingWizardCompletedSteps', JSON.stringify(completedSteps))
      sessionStorage.setItem('bookingWizardData', JSON.stringify(wizardData))
    }
  }, [currentStep, completedSteps, wizardData])

  const handleStepComplete = async (stepId: number, data: any) => {
    console.log(`[BookingWizard] handleStepComplete called for step ${stepId} with data:`, data)

    // Mark step as completed
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }

    // Update wizard data (don't auto-advance or submit, let Continue button handle that)
    const updatedData = { ...wizardData, ...data }
    console.log('[BookingWizard] Updated wizardData:', updatedData)
    setWizardData(updatedData)
  }

  const submitToIntakeAPI = async (data: typeof wizardData) => {
    console.log('[BookingWizard] ===== SUBMIT TO INTAKE API CALLED =====')
    console.log('[BookingWizard] wizardData being submitted:', data)

    try {
      console.log('[BookingWizard] Step 1: Fetching customer profile...')
      // Fetch customer profile only (vehicle data is already in wizardData)
      const profileRes = await fetch('/api/customer/profile')

      // Validate profile fetch
      if (!profileRes.ok) {
        console.error('[BookingWizard] Failed to fetch profile, status:', profileRes.status)
        alert('Failed to load your profile. Please try again.')
        return
      }

      console.log('[BookingWizard] Step 2: Profile fetched successfully')

      const profileData = await profileRes.json()
      // Use vehicle data from wizardData (passed from VehicleStep)
      const vehicleData = data.vehicleData || null

      // Debug logging
      console.log('Profile data received:', profileData)
      console.log('Checking fields:', {
        full_name: profileData?.profile?.full_name,
        email: profileData?.profile?.email,
        phone: profileData?.profile?.phone,
      })

      // Validate required profile fields
      if (!profileData?.profile?.full_name || !profileData?.profile?.email || !profileData?.profile?.phone) {
        console.error('Profile validation failed. Missing fields:', {
          has_full_name: !!profileData?.profile?.full_name,
          has_email: !!profileData?.profile?.email,
          has_phone: !!profileData?.profile?.phone,
        })
        alert('Your profile is missing required information (name, email, or phone). Please complete your profile first.')
        router.push('/customer/profile')
        return
      }

      // Build intake payload matching exact format of intake form
      const intakePayload = {
        // Plan
        plan: data.planType || 'standard',

        // Customer contact info (required)
        name: profileData.profile.full_name,
        email: profileData.profile.email,
        phone: profileData.profile.phone,
        city: data.city || profileData.profile.city || '',
        postalCode: data.postalCode || profileData.profile.postal_code || '',

        // NEW: Customer location for matching (explicit fields)
        customer_country: data.country || profileData.profile.country || '',
        customer_province: data.province || profileData.profile.province || '',
        customer_city: data.city || profileData.profile.city || '',
        customer_postal_code: data.postalCode || profileData.profile.postal_code || '',

        // Vehicle info from selected vehicle - use data from wizardData
        vin: vehicleData?.vin || '',
        year: vehicleData?.year || '',
        make: vehicleData?.make || '',
        model: vehicleData?.model || '',
        odometer: vehicleData?.odometer || '',
        plate: vehicleData?.license_plate || '',
        vehicle_id: data.vehicleId || null,

        // Concern (required)
        concern: data.concernDescription,
        primaryConcern: data.primaryConcern,
        concernCategory: data.concernCategory,

        // File uploads (match intake form field name)
        files: data.uploadedFiles,

        // Flags
        urgent: data.isUrgent,
        use_credits: false, // Not collected in wizard yet
        is_specialist: data.mechanicType === 'brand_specialist',

        // Mechanic selection
        preferred_mechanic_id: data.mechanicId || null,
        routing_type: data.mechanicId ? 'priority_broadcast' : null,
        requested_brand: data.requestedBrand || null,
      }

      console.log('[BookingWizard] Submitting intake payload:', intakePayload)
      console.log('[BookingWizard] Concern validation check:', {
        concernDescription: data.concernDescription,
        concernLength: data.concernDescription?.length || 0,
        concernTrimmed: data.concernDescription?.trim(),
        concernTrimmedLength: data.concernDescription?.trim().length || 0,
      })

      // Submit to intake API
      const response = await fetch('/api/intake/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakePayload),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Intake API response:', result)

        // Clear sessionStorage on successful submission
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('bookingWizardStep')
          sessionStorage.removeItem('bookingWizardCompletedSteps')
          sessionStorage.removeItem('bookingWizardData')
        }

        // API returns redirect URL (waiver → thank-you/checkout)
        if (result.redirect) {
          router.push(result.redirect)
        } else if (result.sessionId) {
          // Fallback: direct session creation (shouldn't happen normally)
          router.push(`/thank-you?session_id=${result.sessionId}`)
        } else {
          router.push('/customer/dashboard')
        }
      } else {
        const error = await response.json()
        console.error('Intake API error:', error)
        alert(`Failed to start session: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to submit intake:', err)
      alert('Failed to start session. Please try again.')
    }
  }

  const handleStepClick = (stepId: number) => {
    // Only allow clicking PREVIOUS steps to go back and edit
    // Never allow jumping FORWARD without validation
    if (stepId < currentStep && completedSteps.includes(stepId)) {
      // Going backwards is OK
      setCurrentStep(stepId)

      // Clear all future steps to force re-validation
      setCompletedSteps(prev => prev.filter(s => s < stepId))
    }
    // Otherwise, user must use Continue button with validation
  }

  const canGoBack = true // Always allow back (either to previous step or dashboard)

  // 🚨 CRITICAL SECURITY: Validate ACTUAL data, not just completedSteps array
  const canGoNext = (() => {
    // Step 1: Vehicle (unless advice-only)
    if (currentStep === 1) {
      if (wizardData.isAdviceOnly === true) return true
      return !!wizardData.vehicleId
    }

    // Step 2: Plan (and specialist premium consent if applicable)
    if (currentStep === 2) {
      // ✅ FIX: Accept ANY plan with a value, not just specific slugs
      // Plan IDs are slugs from database (e.g., 'free', 'quick', 'standard', 'diagnostic')
      const hasValidPlan = !!wizardData.planType && typeof wizardData.planType === 'string' && wizardData.planType.trim().length > 0

      // If specialist requested, must accept premium
      if (wizardData.requestedBrand || wizardData.specialistPremium > 0) {
        return hasValidPlan && wizardData.specialistPremiumAccepted === true
      }

      return hasValidPlan
    }

    // Step 3: Mechanic (must be online)
    if (currentStep === 3) {
      return !!wizardData.mechanicId &&
             wizardData.mechanicPresenceStatus === 'online'
    }

    // Step 4: Concern (minimum length + primary concern)
    if (currentStep === 4) {
      const isValid = !!wizardData.primaryConcern &&
             !!wizardData.concernDescription &&
             wizardData.concernDescription.trim().length >= 10
      console.log('[BookingWizard] Step 4 validation:', {
        primaryConcern: wizardData.primaryConcern,
        concernDescription: wizardData.concernDescription,
        length: wizardData.concernDescription?.length || 0,
        trimmedLength: wizardData.concernDescription?.trim().length || 0,
        isValid
      })
      return isValid
    }

    return false
  })()

  const isLastStep = currentStep === 4

  const handleBack = () => {
    if (currentStep === 1) {
      // On first step, go back to dashboard
      router.push('/customer/dashboard')
    } else {
      // Otherwise go to previous step
      setCurrentStep(Math.max(1, currentStep - 1))
    }
  }

  const CurrentStepComponent = STEPS.find(s => s.id === currentStep)?.component

  return (
    <div className="min-h-screen">
      {/* Header with Progress Pills */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* Current Step Title - Now on Top */}
          <div className="text-center mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Step {currentStep}: {STEPS.find(s => s.id === currentStep)?.title}
            </h2>
            {/* Next Step Indicator */}
            {currentStep === 4 && (
              <p className="text-xs text-slate-400 mt-1">
                Next: <span className="text-orange-400 font-semibold">Review & Accept Waiver</span>
              </p>
            )}
          </div>

          {/* Progress Pills - Now Below Title */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id
              const isCompleted = completedSteps.includes(step.id)
              const isClickable = isCompleted || step.id === Math.min(...STEPS.map(s => s.id).filter(id => !completedSteps.includes(id)))
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Pill */}
                  <button
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isClickable}
                    title={step.tooltip}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full transition-all
                      ${isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : isCompleted
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                      }
                      ${isClickable && !isActive ? 'cursor-pointer hover:bg-slate-700' : ''}
                      ${!isClickable ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="text-sm font-semibold hidden sm:inline">{step.title}</span>
                  </button>

                  {/* Connector Line */}
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${completedSteps.includes(step.id) ? 'bg-green-500/30' : 'bg-slate-700/30'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        {/* Booking Guide */}
        <BookingGuide currentStep={currentStep} onDismiss={() => {}} />

        {/* Specialist Request Banner - Show on all steps */}
        {wizardData.requestedBrand && (
          <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-orange-400" />
              <div>
                <h3 className="text-white font-bold">
                  {wizardData.requestedBrand} Specialist Selected
                </h3>
                <p className="text-sm text-slate-300">
                  You'll be matched with certified {wizardData.requestedBrand} experts
                </p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {CurrentStepComponent && (
              <CurrentStepComponent
                wizardData={wizardData}
                onComplete={(data: any) => handleStepComplete(currentStep, data)}
                onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Footer Navigation */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all
                ${canGoBack
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>

            {/* Progress Indicator */}
            <div className="text-sm text-slate-400">
              Step {currentStep} of {STEPS.length}
            </div>

            {/* Next/Finish Button */}
            <button
              onClick={async (e) => {
                console.log('[BookingWizard] ===== BUTTON CLICKED =====')
                console.log('[BookingWizard] Event:', e)
                console.log('[BookingWizard] canGoNext:', canGoNext)
                console.log('[BookingWizard] isLastStep:', isLastStep)
                console.log('[BookingWizard] currentStep:', currentStep)

                if (!canGoNext) {
                  console.log('[BookingWizard] Button disabled - canGoNext is false')
                  alert('Validation failed. Check console for details.')
                  return
                }

                if (isLastStep) {
                  // Step 4: Submit to intake API
                  console.log('[BookingWizard] Continue clicked on Step 4 - submitting to intake API')
                  console.log('[BookingWizard] wizardData at button click:', wizardData)

                  // Show loading indicator
                  const btn = e.currentTarget
                  const originalText = btn.innerHTML
                  btn.innerHTML = 'Submitting...'
                  btn.disabled = true

                  try {
                    await submitToIntakeAPI(wizardData)
                  } catch (error) {
                    console.error('[BookingWizard] Error in submitToIntakeAPI:', error)
                    alert('Submission failed. Check console for details.')
                    // Restore button
                    btn.innerHTML = originalText
                    btn.disabled = false
                  }
                } else {
                  // Other steps: Advance to next step
                  console.log('[BookingWizard] Advancing to next step')
                  setCurrentStep(currentStep + 1)
                }
              }}
              disabled={!canGoNext}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all
                ${canGoNext
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isLastStep ? 'Review & Submit' : 'Continue'}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
