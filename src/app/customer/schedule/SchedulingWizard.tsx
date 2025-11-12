'use client'

/**
 * SchedulingWizard - Multi-step wizard for scheduling future appointments
 *
 * 7-Step Flow:
 * 1. Service Type (Online / In-Person)
 * 2. Vehicle Selection
 * 3. Plan Selection
 * 4. Mechanic Selection (with search & filters)
 * 5. Time Selection (calendar)
 * 6. Concern Description
 * 7. Review & Payment
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Step Components
import ServiceTypeStep from '@/components/customer/scheduling/ServiceTypeStep'
import VehicleStep from '@/components/customer/booking-steps/VehicleStep'
import PlanStep from '@/components/customer/booking-steps/PlanStep'
import SearchableMechanicList from '@/components/customer/scheduling/SearchableMechanicList'
import CalendarStep from '@/components/customer/scheduling/CalendarStep'
import ScheduledSessionIntakeStep from '@/components/customer/scheduling/ScheduledSessionIntakeStep'
import ReviewAndPaymentStep from '@/components/customer/scheduling/ReviewAndPaymentStep'

const STEPS = [
  { id: 1, name: 'Service Type' },
  { id: 2, name: 'Vehicle' },
  { id: 3, name: 'Plan' },
  { id: 4, name: 'Mechanic' },
  { id: 5, name: 'Time' },
  { id: 6, name: 'Concern' },
  { id: 7, name: 'Review' }
]

export default function SchedulingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<any>({
    sessionType: null, // 'online' or 'in_person' (from ServiceTypeStep)
    vehicleId: null,
    vehicleName: null,
    vehicleData: null,
    isAdviceOnly: false,
    planType: null,
    planPrice: null,
    mechanicId: null,
    mechanicName: null,
    scheduledFor: null,
    // NEW: Scheduled session intake fields (from ScheduledSessionIntakeStep)
    serviceType: null, // 'diagnostic', 'repair', 'maintenance', 'inspection', 'consultation'
    serviceDescription: null,
    preparationNotes: null,
    specialRequests: null,
    uploadedFiles: []
  })

  // Check for context from BookingWizard on mount
  useEffect(() => {
    const context = sessionStorage.getItem('schedulingContext')
    if (context) {
      try {
        const { vehicleId, planType, mechanicId, mechanicName, concern, source } = JSON.parse(context)
        console.log('[SchedulingWizard] Pre-filling from context:', source)

        setWizardData((prev: any) => ({
          ...prev,
          vehicleId: vehicleId || null,
          planType: planType || null,
          mechanicId: mechanicId || null,
          mechanicName: mechanicName || null,
          concernDescription: concern || null
        }))

        // ✅ ISSUE #6 FIX: If we have vehicle, plan, and mechanic, skip to Step 5 (Time selection)
        // User already made these selections in BookingWizard, no need to reconfirm
        const hasCompleteContext = vehicleId && planType && mechanicId
        if (hasCompleteContext) {
          console.log('[SchedulingWizard] Complete context detected, jumping to Step 5 (Time selection)')
          setCurrentStep(5) // Skip directly to calendar
        } else {
          // Partial context, start at Step 1 but pre-fill what we have
          setCurrentStep(1)
        }

        // Clear context
        sessionStorage.removeItem('schedulingContext')
      } catch (err) {
        console.error('[SchedulingWizard] Error parsing context:', err)
      }
    }
  }, [])

  const handleStepComplete = (stepData: any) => {
    console.log(`[SchedulingWizard] Step ${currentStep} completed with:`, stepData)

    setWizardData((prev: any) => ({
      ...prev,
      ...stepData
    }))

    // Auto-advance to next step
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      router.push('/customer/dashboard')
    }
  }

  // ✅ ISSUE #9: Allow clicking completed progress pills to jump back
  const handlePillClick = (stepId: number) => {
    // Only allow clicking on completed steps (before current step)
    if (stepId < currentStep) {
      console.log(`[SchedulingWizard] Jumping back to Step ${stepId}`)
      setCurrentStep(stepId)
    }
  }

  const handleComplete = () => {
    console.log('[SchedulingWizard] ✅ Wizard completed!')
    // ReviewAndPaymentStep handles the final redirect
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ServiceTypeStep
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 2:
        return (
          <VehicleStep
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 3:
        return (
          <PlanStep
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 4:
        return (
          <SearchableMechanicList
            sessionType={wizardData.sessionType}
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 5:
        return (
          <CalendarStep
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 6:
        return (
          <ScheduledSessionIntakeStep
            wizardData={wizardData}
            onComplete={handleStepComplete}
            onBack={handleBack}
          />
        )
      case 7:
        return (
          <ReviewAndPaymentStep
            wizardData={wizardData}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-4 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Progress Header */}
        <div className="mb-6 sm:mb-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-4 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 1 ? 'Back to Dashboard' : 'Previous Step'}
          </button>

          {/* Progress Pills - ✅ ISSUE #9: Clickable for backward navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              const isUpcoming = step.id > currentStep
              const isClickable = isCompleted // Only completed steps are clickable

              return (
                <button
                  key={step.id}
                  onClick={() => handlePillClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30 hover:border-green-500/70 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }
                  `}
                  title={isClickable ? `Go back to ${step.name}` : isActive ? `Current: ${step.name}` : `Complete previous steps first`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {isCompleted ? '✓' : step.id}
                  </span>
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
              )
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Pre-selected Context Banner */}
        {wizardData.mechanicId && wizardData.mechanicName && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-300 font-medium mb-2">
                  Ready to Schedule Appointment
                </p>
                <div className="text-green-400/90 text-sm space-y-1">
                  {wizardData.vehicleName && <div>📍 Vehicle: {wizardData.vehicleName}</div>}
                  {wizardData.planType && <div>📋 Plan: {wizardData.planType}</div>}
                  <div>👤 Mechanic: {wizardData.mechanicName}</div>
                </div>
                <p className="text-green-400/70 text-xs mt-2">
                  {currentStep === 5
                    ? 'Select a date and time below. You can go back to change these selections if needed.'
                    : 'Continue through the steps, or use the back button to modify your selections.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl">
          {renderStep()}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-xs sm:text-sm text-slate-500">
          <p>Need help? Contact us at support@theautodoctor.com</p>
        </div>
      </div>
    </div>
  )
}
