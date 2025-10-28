'use client'

import { Check } from 'lucide-react'

type Step = {
  id: string
  label: string
  completed: boolean
  current?: boolean
}

interface ProgressTrackerProps {
  steps: Step[]
}

export function ProgressTracker({ steps }: ProgressTrackerProps) {
  return (
    <div className="w-full px-2 sm:px-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-1 items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  step.completed
                    ? 'border-green-500 bg-green-500'
                    : step.current
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-slate-600 bg-slate-800'
                }`}
              >
                {step.completed ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      step.current ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium ${
                  step.completed
                    ? 'text-green-400'
                    : step.current
                    ? 'text-blue-400'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`mx-1 sm:mx-2 h-0.5 flex-1 transition-colors ${
                  step.completed ? 'bg-green-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
