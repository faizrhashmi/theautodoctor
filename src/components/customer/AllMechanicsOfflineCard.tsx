'use client'

/**
 * AllMechanicsOfflineCard - Graceful fallback when no mechanics are online
 *
 * Provides 3 options when all mechanics are offline:
 * 1. Schedule session for later (with calendar picker)
 * 2. Browse all mechanics (view profiles even when offline)
 * 3. Join waitlist (notify when a mechanic comes online)
 */

import { useState } from 'react'
import { Calendar, Users, Bell, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AllMechanicsOfflineCardProps {
  onSchedule?: () => void
  onBrowseMechanics?: () => void
  onJoinWaitlist?: () => void
  className?: string
  wizardData?: any // Pass wizard data for context pre-filling in SchedulingPage
}

export default function AllMechanicsOfflineCard({
  onSchedule,
  onBrowseMechanics,
  onJoinWaitlist,
  className = '',
  wizardData
}: AllMechanicsOfflineCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false) // ✅ FIXED: Collapsed by default
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  const handleSchedule = () => {
    if (onSchedule) {
      onSchedule()
    } else {
      // Store wizard context in sessionStorage for pre-filling SchedulingPage
      if (wizardData) {
        const schedulingContext = {
          vehicleId: wizardData.vehicleId,
          planType: wizardData.planType,
          concern: wizardData.concernDescription,
          source: 'booking_wizard_offline',
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem('schedulingContext', JSON.stringify(schedulingContext))
      }

      // Navigate to scheduling page
      router.push('/customer/schedule')
    }
  }

  const handleBrowseMechanics = () => {
    if (onBrowseMechanics) {
      onBrowseMechanics()
    } else {
      // Default: Show all mechanics (including offline)
      console.log('[AllMechanicsOfflineCard] Browse mechanics option selected')
      // Just continue showing mechanics list but with offline indicators
    }
  }

  const handleJoinWaitlist = async () => {
    setJoiningWaitlist(true)

    try {
      // Call waitlist API (to be implemented in Phase 6.3)
      const response = await fetch('/api/customer/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_type: 'mechanic_online',
          metadata: {
            source: 'mechanic_selection',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        setWaitlistJoined(true)
        if (onJoinWaitlist) onJoinWaitlist()
      } else {
        console.error('[AllMechanicsOfflineCard] Failed to join waitlist')
        alert('Failed to join waitlist. Please try again.')
      }
    } catch (err) {
      console.error('[AllMechanicsOfflineCard] Error joining waitlist:', err)
      alert('Failed to join waitlist. Please try again.')
    } finally {
      setJoiningWaitlist(false)
    }
  }

  return (
    <div className={`bg-amber-500/10 border border-amber-500/30 rounded-lg ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">All Mechanics Are Currently Offline</h3>
            <p className="text-sm text-amber-300 mt-0.5">
              Don't worry! You have several options to get help.
            </p>
          </div>
        </div>
        <button className="text-amber-400 hover:text-amber-300 transition">
          {expanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Options */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* ✅ REMOVED: "Schedule for Later" option - redundant with mechanic card buttons */}

          {/* Option 1: Browse Mechanics */}
          <button
            onClick={handleBrowseMechanics}
            className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg p-4 transition group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white">Browse All Mechanics</h4>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
                </div>
                <p className="text-sm text-slate-400">
                  View mechanic profiles, ratings, and specialties. You can select a preferred mechanic and schedule with them.
                </p>
                <div className="mt-2 text-xs text-purple-400">
                  💡 Tip: Choose a mechanic with high ratings and relevant experience
                </div>
              </div>
            </div>
          </button>

          {/* Option 3: Join Waitlist */}
          {!waitlistJoined ? (
            <button
              onClick={handleJoinWaitlist}
              disabled={joiningWaitlist}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg p-4 transition group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition">
                  <Bell className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">
                      {joiningWaitlist ? 'Joining Waitlist...' : 'Join Waitlist'}
                    </h4>
                    {!joiningWaitlist && (
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    We'll notify you immediately when a mechanic comes online. Continue browsing and we'll alert you.
                  </p>
                  <div className="mt-2 text-xs text-green-400">
                    💡 Tip: You'll receive a browser notification and email alert
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-green-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-400 mb-1">✓ You're on the Waitlist!</h4>
                  <p className="text-sm text-green-300">
                    We'll notify you as soon as a mechanic comes online. Feel free to continue browsing or schedule a session.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-amber-500/20">
          <p className="text-xs text-slate-500 text-center">
            Average response time: <span className="text-amber-400 font-semibold">15-30 minutes</span> during business hours
          </p>
        </div>
      )}
    </div>
  )
}
