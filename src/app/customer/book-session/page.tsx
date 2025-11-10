'use client'

/**
 * Customer Booking Page - New 6-Step Wizard
 * Route: /customer/book-session
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { routeFor } from '@/lib/routes'
import BookingWizard from '@/components/customer/BookingWizard'
import { Loader2 } from 'lucide-react'

export default function BookSessionPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuthGuard({
    redirectTo: routeFor.login(),
    requiredRole: 'customer'
  })
  const [activeSessionModal, setActiveSessionModal] = useState<{
    sessionId: string
    sessionType: string
    sessionStatus: string
  } | null>(null)

  // Check for active session
  useEffect(() => {
    async function checkActiveSession() {
      if (!isAuthenticated) return

      try {
        const response = await fetch('/api/customer/active-sessions')
        if (response.ok) {
          const data = await response.json()
          if (data.activeSessions && data.activeSessions.length > 0) {
            const session = data.activeSessions[0]
            setActiveSessionModal({
              sessionId: session.id,
              sessionType: session.type || 'chat',
              sessionStatus: session.status || 'pending'
            })
          }
        }
      } catch (err) {
        console.error('Failed to check active sessions:', err)
      }
    }

    checkActiveSession()
  }, [isAuthenticated])

  const handleBookingComplete = (sessionId: string) => {
    // Redirect to thank you page or session page
    router.push(`/thank-you?session_id=${sessionId}`)
  }

  const handleBookingCancel = () => {
    // Redirect back to dashboard
    router.push('/customer/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-orange-500 animate-spin" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Auth guard will redirect
  }

  // Show active session modal if there's an active session
  if (activeSessionModal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">Active Session in Progress</h3>
              <p className="mt-2 text-sm text-slate-300">
                You already have a session that's {activeSessionModal.sessionStatus}. You can only have one active session at a time.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">
              Please complete or cancel your current session before starting a new one.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push(activeSessionModal.sessionType === 'chat'
                ? `/chat/${activeSessionModal.sessionId}`
                : `/video/${activeSessionModal.sessionId}`
              )}
              className="w-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600 active:scale-95 touch-manipulation"
            >
              Return to Active Session
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95 touch-manipulation"
              >
                Go to Dashboard
              </button>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to end this session? This action cannot be undone.')) {
                    try {
                      const response = await fetch(`/api/sessions/${activeSessionModal.sessionId}/end`, {
                        method: 'POST',
                      })
                      if (response.ok) {
                        setActiveSessionModal(null)
                      } else {
                        alert('Failed to end session. Please try again.')
                      }
                    } catch (error) {
                      alert('Failed to end session. Please try again.')
                    }
                  }
                }}
                className="flex-1 rounded-full border border-red-400/50 bg-red-500/10 px-6 py-3.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 active:scale-95 touch-manipulation"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BookingWizard
      onComplete={handleBookingComplete}
      onCancel={handleBookingCancel}
    />
  )
}
