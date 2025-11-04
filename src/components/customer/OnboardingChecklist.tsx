'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Circle,
  X,
  ArrowRight,
  Car,
  Video,
  FileText,
  ClipboardList,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { apiRouteFor } from '@/lib/routes'

/**
 * Onboarding Checklist Component
 * Phase 2.1: Guides new customers through their first steps
 */

interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  icon: string
  action?: string | null
}

interface OnboardingProgress {
  dismissed: boolean
  dismissed_at?: string
  steps: OnboardingStep[]
  completed_count: number
  total_count: number
  progress_percentage: number
  all_completed?: boolean
}

export default function OnboardingChecklist() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await fetch(apiRouteFor.onboardingProgress())

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding progress')
      }

      const data = await response.json()
      setProgress(data)
    } catch (error) {
      console.error('[OnboardingChecklist] Error fetching progress:', error)
      // Don't show error to user, just don't show checklist
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!confirm('Are you sure you want to dismiss the onboarding checklist? You can always access it again from your profile settings.')) {
      return
    }

    setDismissing(true)

    try {
      const response = await fetch(apiRouteFor.onboardingProgress(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (!response.ok) {
        throw new Error('Failed to dismiss onboarding')
      }

      // Refresh progress to hide checklist
      await fetchProgress()
    } catch (error) {
      console.error('[OnboardingChecklist] Error dismissing:', error)
      alert('Failed to dismiss onboarding checklist')
    } finally {
      setDismissing(false)
    }
  }

  const handleStepAction = (action?: string | null) => {
    if (action) {
      router.push(action)
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'check_circle':
        return CheckCircle
      case 'directions_car':
        return Car
      case 'videocam':
        return Video
      case 'description':
        return FileText
      case 'request_quote':
        return ClipboardList
      default:
        return Circle
    }
  }

  // Don't show if loading
  if (loading) {
    return null
  }

  // Don't show if dismissed or no progress data
  if (!progress || progress.dismissed) {
    return null
  }

  // Don't show if all completed
  if (progress.all_completed) {
    return null
  }

  return (
    <div className="mb-6 sm:mb-8 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-4 sm:p-6 shadow-2xl backdrop-blur relative">
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
        title="Dismiss checklist"
      >
        {dismissing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Get Started with AutoDoctor
            </h3>
            <p className="text-xs sm:text-sm text-blue-300">
              Complete these steps to unlock the full experience
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs sm:text-sm text-blue-300 mb-2">
            <span>Your Progress</span>
            <span className="font-bold">
              {progress.completed_count} / {progress.total_count} completed
            </span>
          </div>
          <div className="h-2 sm:h-3 bg-blue-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {progress.steps.map((step, index) => {
          const IconComponent = getIconComponent(step.icon)
          const isNextAction = !step.completed && progress.steps.slice(0, index).every((s) => s.completed)

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all ${
                step.completed
                  ? 'bg-green-500/10 border-green-500/30'
                  : isNextAction
                  ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full ${
                  step.completed
                    ? 'bg-green-500/20'
                    : isNextAction
                    ? 'bg-blue-500/20'
                    : 'bg-slate-700/50'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                ) : (
                  <IconComponent
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      isNextAction ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4
                      className={`text-sm sm:text-base font-semibold ${
                        step.completed ? 'text-green-300' : 'text-white'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  {!step.completed && step.action && (
                    <button
                      onClick={() => handleStepAction(step.action)}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        isNextAction
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      <span className="hidden sm:inline">Go</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Hint */}
      <div className="mt-4 pt-4 border-t border-blue-400/20">
        <p className="text-xs text-blue-300/70 text-center">
          Complete all steps to unlock full platform features and personalized recommendations
        </p>
      </div>
    </div>
  )
}
