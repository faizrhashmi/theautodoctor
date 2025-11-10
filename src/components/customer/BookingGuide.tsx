'use client'

/**
 * Booking Guide Component
 * Shows step-by-step guidance for first-time users during booking
 */

import { useState, useEffect } from 'react'
import { X, Lightbulb, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookingGuideProps {
  currentStep: number
  onDismiss: () => void
}

const STEP_GUIDES = {
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
    highlight: "Your vehicle info helps mechanics better understand your needs"
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
    highlight: "Choose based on how much time you think you'll need"
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
    highlight: "Brand specialists have deeper expertise but cost extra"
  }
}

export default function BookingGuide({ currentStep, onDismiss }: BookingGuideProps) {
  const [dismissed, setDismissed] = useState(false)
  const [hasSeenGuide, setHasSeenGuide] = useState(false)

  useEffect(() => {
    // Check if user has seen the guide before
    const seen = localStorage.getItem('booking_guide_seen')
    if (seen === 'true') {
      setHasSeenGuide(true)
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('booking_guide_seen', 'true')
    onDismiss()
  }

  const guide = STEP_GUIDES[currentStep as keyof typeof STEP_GUIDES]

  if (dismissed || hasSeenGuide || !guide) {
    return null
  }

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
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors z-10"
          title="Dismiss guide"
        >
          <X className="w-4 h-4" />
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
              className="text-xs text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1"
            >
              Got it, don't show this again
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
