'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Plus, X, ArrowRight, Sparkles } from 'lucide-react'
import { routeFor } from '@/lib/routes'

/**
 * Vehicle Prompt Component
 * Phase 2.3: Encourages customers to add vehicle information
 *
 * Shown when:
 * - Customer has no vehicles
 * - Before starting a session (optional context)
 * - Dismissible but persistent
 */

interface VehiclePromptProps {
  variant?: 'dashboard' | 'session-start' | 'inline'
  onDismiss?: () => void
  onVehicleAdded?: () => void
}

export default function VehiclePrompt({
  variant = 'dashboard',
  onDismiss,
  onVehicleAdded,
}: VehiclePromptProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  const handleAddVehicle = () => {
    router.push(routeFor.customerVehicles())
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) {
    return null
  }

  // Dashboard variant - full card
  if (variant === 'dashboard') {
    return (
      <div className="mb-6 sm:mb-8 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-4 sm:p-6 shadow-xl backdrop-blur relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
            <Car className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Add Your Vehicle
              </h3>
              <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0" />
            </div>

            <p className="text-sm sm:text-base text-slate-300 mb-4">
              Get personalized diagnostics and faster service by adding your vehicle details.
              Our mechanics can provide more accurate advice when they know your car's make, model, and year.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>Faster diagnostics</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>Accurate part recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>Service history tracking</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>Maintenance reminders</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleAddVehicle}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              Add Your First Vehicle
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Session-start variant - compact banner
  if (variant === 'session-start') {
    return (
      <div className="mb-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500/20">
            <Car className="h-5 w-5 text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-0.5">
              Add vehicle for better diagnostics
            </h4>
            <p className="text-xs text-slate-400">
              Help mechanics provide more accurate advice
            </p>
          </div>

          <button
            onClick={handleAddVehicle}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-xs transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
    )
  }

  // Inline variant - minimal prompt
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
        <Car className="h-5 w-5 text-purple-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300">
            <span className="font-medium">No vehicle added yet.</span> Add one for personalized service.
          </p>
        </div>
        <button
          onClick={handleAddVehicle}
          className="flex-shrink-0 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
        >
          Add now
        </button>
      </div>
    )
  }

  return null
}
