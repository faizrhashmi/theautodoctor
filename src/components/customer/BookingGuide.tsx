'use client'

/**
 * Enhanced Booking Guide Component
 * Guides users from dashboard through all 4 booking steps
 *
 * Features:
 * - Dashboard mode (step 0): Welcome guide with CTA
 * - Wizard mode (steps 1-4): Contextual tips for each step
 * - Backend persistence via API (not localStorage)
 * - Supports dismiss/restore from profile settings
 * - Progress tracking across entire booking journey
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  Circle,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRouteFor } from '@/lib/routes'

interface BookingGuideProps {
  /**
   * Current step in the booking wizard:
   * - 0: Dashboard (welcome mode)
   * - 1: Vehicle Selection
   * - 2: Plan Selection
   * - 3: Mechanic Selection
   * - 4: Concern Description
   */
  currentStep?: number
  onDismiss?: () => void
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

interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  icon: string
  action?: string | null
}

const STEP_GUIDES = {
  0: {
    title: "Welcome to AskAutoDoctor!",
    tips: [
      {
        icon: "👋",
        text: "Get expert automotive advice from certified mechanics"
      },
      {
        icon: "💬",
        text: "Chat or video call with mechanics in real-time"
      },
      {
        icon: "🚀",
        text: "Click 'Book a Session' below to get started"
      }
    ],
    highlight: "Your first step is just a click away!",
    showCTA: true
  },
  1: {
    title: "Step 1: Vehicle Selection",
    tips: [
      {
        icon: "🚗",
        text: "Select the vehicle that needs service from your garage"
      },
      {
        icon: "➕",
        text: "Don't have a vehicle saved? Click 'Add Vehicle' to quickly add one"
      },
      {
        icon: "💡",
        text: "Just need advice? Click 'Skip - Just Advice' to proceed without selecting a vehicle"
      }
    ],
    highlight: "Your vehicle info helps mechanics better understand your needs",
    showCTA: false
  },
  2: {
    title: "Step 2: Service Plan",
    tips: [
      {
        icon: "⏱️",
        text: "Standard Plan: 30-minute sessions for quick consultations"
      },
      {
        icon: "🔧",
        text: "Extended Plan: 1-hour sessions for complex issues"
      },
      {
        icon: "💎",
        text: "Premium Plan: 2-hour sessions with priority support"
      }
    ],
    highlight: "Choose based on how much time you think you'll need",
    showCTA: false
  },
  3: {
    title: "Step 3: Choose Your Mechanic",
    tips: [
      {
        icon: "⭐",
        text: "Standard Mechanic: General expertise, included in your plan"
      },
      {
        icon: "💰",
        text: "Brand Specialist: Expert in specific brands like BMW, Toyota (+$15 premium)"
      },
      {
        icon: "❤️",
        text: "My Favorites: Mechanics you've saved from previous sessions"
      },
      {
        icon: "📍",
        text: "Location is pre-filled from your profile to find nearby mechanics"
      },
      {
        icon: "🎯",
        text: "Add postal code for even more precise local matching"
      }
    ],
    highlight: "Brand specialists have deeper expertise but cost extra",
    showCTA: false
  },
  4: {
    title: "Step 4: Describe Your Concern",
    tips: [
      {
        icon: "📝",
        text: "Be specific: Include symptoms, sounds, or warning lights"
      },
      {
        icon: "📸",
        text: "Upload photos/videos to help the mechanic understand better"
      },
      {
        icon: "⚠️",
        text: "Mark as urgent if you need immediate assistance"
      },
      {
        icon: "🔍",
        text: "Select the concern category that best matches your issue"
      }
    ],
    highlight: "Clear descriptions help mechanics diagnose faster and more accurately",
    showCTA: false
  }
}

export default function BookingGuide({ currentStep = 0, onDismiss }: BookingGuideProps) {
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
      console.error('[BookingGuide] Error fetching progress:', error)
      // Don't show error to user, just don't show guide
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!confirm('Are you sure you want to dismiss the booking guide? You can always restore it from your profile settings.')) {
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
        throw new Error('Failed to dismiss guide')
      }

      // Refresh progress to hide guide
      await fetchProgress()

      // Call onDismiss callback if provided
      if (onDismiss) {
        onDismiss()
      }
    } catch (error) {
      console.error('[BookingGuide] Error dismissing:', error)
      alert('Failed to dismiss booking guide')
    } finally {
      setDismissing(false)
    }
  }

  const handleStartBooking = () => {
    router.push('/customer/book-session')
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

  const guide = STEP_GUIDES[currentStep as keyof typeof STEP_GUIDES]

  if (!guide) {
    return null
  }

  // Dashboard mode (step 0) - Show welcome guide with progress
  if (currentStep === 0) {
    return (
      <div className="mb-6 sm:mb-8 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 sm:p-6 shadow-2xl backdrop-blur relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 animate-pulse" />

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 z-10"
          title="Dismiss guide"
        >
          {dismissing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {guide.title}
                </h3>
                <p className="text-xs sm:text-sm text-amber-300">
                  Get started with your booking journey
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs sm:text-sm text-amber-300 mb-2">
                <span>Your Progress</span>
                <span className="font-bold">
                  {progress.completed_count} / {progress.total_count} completed
                </span>
              </div>
              <div className="h-2 sm:h-3 bg-amber-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress.progress_percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tips List */}
          <div className="space-y-2 mb-4">
            {guide.tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-slate-200"
              >
                <span className="text-lg sm:text-xl flex-shrink-0 mt-[-2px]">{tip.icon}</span>
                <span className="flex-1">{tip.text}</span>
              </div>
            ))}
          </div>

          {/* Highlight Box */}
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 sm:p-4 flex items-start gap-2 mb-4">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              {guide.highlight}
            </p>
          </div>

          {/* CTA Button */}
          {guide.showCTA && (
            <button
              onClick={handleStartBooking}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              Book a Session
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          {/* Footer Hint */}
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <p className="text-xs text-amber-300/70 text-center">
              Complete all steps to unlock full platform features and personalized recommendations
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Wizard mode (steps 1-4) - Show contextual tips
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6 rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 shadow-xl backdrop-blur relative overflow-hidden"
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 animate-pulse" />

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors z-10 disabled:opacity-50"
          title="Dismiss guide"
        >
          {dismissing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white">
                {guide.title}
              </h3>
              <p className="text-xs text-amber-300">
                Quick tips to help you get started
              </p>
            </div>
          </div>

          {/* Tips List */}
          <div className="space-y-2 mb-3">
            {guide.tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-slate-200"
              >
                <span className="text-lg flex-shrink-0 mt-[-2px]">{tip.icon}</span>
                <span className="flex-1">{tip.text}</span>
              </div>
            ))}
          </div>

          {/* Highlight Box */}
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-100 font-medium">
              {guide.highlight}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="text-xs text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {dismissing ? 'Dismissing...' : "Got it, don't show this again"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
