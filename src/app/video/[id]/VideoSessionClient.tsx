'use client'

import { useEffect, useState, useCallback } from 'react'
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useTracks } from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { Clock, UserPlus, AlertCircle } from 'lucide-react'

type PlanKey = 'chat10' | 'video15' | 'diagnostic'

const PLAN_DURATIONS: Record<PlanKey, number> = {
  chat10: 30,
  video15: 45,
  diagnostic: 60,
}

const TIME_EXTENSIONS = [
  { duration: 15, price: 1499, label: '15 minutes - $14.99' },
  { duration: 30, price: 2499, label: '30 minutes - $24.99' },
  { duration: 60, price: 3999, label: '60 minutes - $39.99' },
]

interface VideoSessionClientProps {
  sessionId: string
  userId: string
  userRole: 'mechanic' | 'customer'
  plan: PlanKey
  planName: string
  token: string
  serverUrl: string
  status: string
  startedAt: string | null
  mechanicId: string | null
  customerId: string | null
  dashboardUrl: string
}

function ParticipantMonitor({
  onMechanicJoined,
  onMechanicLeft,
  onCustomerJoined,
  onCustomerLeft,
}: {
  onMechanicJoined: () => void
  onMechanicLeft: () => void
  onCustomerJoined: () => void
  onCustomerLeft: () => void
}) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])

  useEffect(() => {
    const mechanicTracks = tracks.filter((track) => {
      const metadata = track.participant.metadata
      try {
        const parsed = metadata ? JSON.parse(metadata) : {}
        return parsed.role === 'mechanic'
      } catch {
        return false
      }
    })

    const customerTracks = tracks.filter((track) => {
      const metadata = track.participant.metadata
      try {
        const parsed = metadata ? JSON.parse(metadata) : {}
        return parsed.role === 'customer'
      } catch {
        return false
      }
    })

    if (mechanicTracks.length > 0) {
      onMechanicJoined()
    } else {
      onMechanicLeft()
    }

    if (customerTracks.length > 0) {
      onCustomerJoined()
    } else {
      onCustomerLeft()
    }
  }, [tracks, onMechanicJoined, onMechanicLeft, onCustomerJoined, onCustomerLeft])

  return null
}

function SessionTimer({
  startTime,
  durationMinutes,
  onTimeWarning,
  onTimeUp,
}: {
  startTime: Date
  durationMinutes: number
  onTimeWarning: (minutesLeft: number) => void
  onTimeUp: () => void
}) {
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60)
  const [hasWarned5, setHasWarned5] = useState(false)
  const [hasWarned1, setHasWarned1] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, durationMinutes * 60 - elapsed)

      setTimeLeft(remaining)

      // Warnings
      const minutesLeft = Math.floor(remaining / 60)
      if (minutesLeft === 5 && !hasWarned5) {
        setHasWarned5(true)
        onTimeWarning(5)
      }
      if (minutesLeft === 1 && !hasWarned1) {
        setHasWarned1(true)
        onTimeWarning(1)
      }

      if (remaining === 0) {
        onTimeUp()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, durationMinutes, hasWarned5, hasWarned1, onTimeWarning, onTimeUp])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isWarning = minutes < 5
  const isDanger = minutes < 1

  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${
      isDanger ? 'bg-red-500/20 text-red-200' :
      isWarning ? 'bg-amber-500/20 text-amber-200' :
      'bg-orange-500/20 text-orange-200'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="font-mono text-sm font-semibold">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

export default function VideoSessionClient({
  sessionId,
  userId: _userId,
  userRole: _userRole,
  plan,
  planName: _planName,
  token,
  serverUrl,
  status: _status,
  startedAt: _startedAt,
  mechanicId: _mechanicId,
  customerId: _customerId,
  dashboardUrl,
}: VideoSessionClientProps) {
  const [mechanicPresent, setMechanicPresent] = useState(false)
  const [customerPresent, setCustomerPresent] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendingSession, setExtendingSession] = useState(false)
  const [timeWarning, setTimeWarning] = useState<string | null>(null)
  const [bothJoinedNotification, setBothJoinedNotification] = useState(false)

  const durationMinutes = PLAN_DURATIONS[plan] || 45

  // Auto-update session status to "waiting" when first participant joins
  useEffect(() => {
    const updateSessionStatus = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()

        // Check current status first
        const { data: session } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', sessionId)
          .single()

        if (session?.status?.toLowerCase() === 'pending') {
          await supabase
            .from('sessions')
            .update({ status: 'waiting' })
            .eq('id', sessionId)

          console.log('[VIDEO] Session status updated to waiting (first participant joined)')
        }
      } catch (err) {
        console.error('Failed to update video session status:', err)
      }
    }
    updateSessionStatus()
  }, [sessionId])

  const handleMechanicJoined = useCallback(() => {
    console.log('[VIDEO] Mechanic joined')
    setMechanicPresent(true)
  }, [])

  const handleMechanicLeft = useCallback(() => {
    console.log('[VIDEO] Mechanic left')
    setMechanicPresent(false)
  }, [])

  const handleCustomerJoined = useCallback(() => {
    console.log('[VIDEO] Customer joined')
    setCustomerPresent(true)
  }, [])

  const handleCustomerLeft = useCallback(() => {
    console.log('[VIDEO] Customer left')
    setCustomerPresent(false)
  }, [])

  // Dual-join detection: Start session when BOTH participants join
  useEffect(() => {
    if (mechanicPresent && customerPresent && !sessionStarted) {
      console.log('[VIDEO] Both participants present - Starting session!')
      setBothJoinedNotification(true)
      setTimeout(() => setBothJoinedNotification(false), 5000)

      // Mark session as truly started
      setSessionStarted(true)
      setSessionStartTime(new Date())

      // Call API to update session status to 'live' and set started_at
      fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[VIDEO] Session start API response:', data)
        })
        .catch((err) => {
          console.error('[VIDEO] Failed to call session start API:', err)
        })
    }
  }, [mechanicPresent, customerPresent, sessionStarted, sessionId])

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    setTimeWarning(`${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} remaining`)
    setTimeout(() => setTimeWarning(null), 5000)
  }, [])

  const handleTimeUp = useCallback(() => {
    setTimeWarning('Session time has ended')
  }, [])

  const handleExtendTime = async (duration: number, price: number) => {
    setExtendingSession(true)
    try {
      const response = await fetch('/api/session/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          duration,
          price,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create extension checkout')
      }

      const data = await response.json()
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl
    } catch (error) {
      console.error('Error extending session:', error)
      alert('Failed to extend session. Please try again.')
      setExtendingSession(false)
    }
  }

  return (
    <div className="relative h-screen w-full bg-slate-950">
      {/* Waiting Room Overlay - Shows when either participant is missing */}
      {(!mechanicPresent || !customerPresent) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur">
          <div className="max-w-md space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
              <UserPlus className="h-10 w-10 animate-pulse text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {!mechanicPresent && !customerPresent
                  ? 'Waiting for both participants...'
                  : !mechanicPresent
                  ? 'Waiting for mechanic to join'
                  : 'Waiting for customer to join'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {!mechanicPresent && !customerPresent
                  ? 'Session will start when both participants join.'
                  : !mechanicPresent
                  ? 'A certified mechanic will join shortly.'
                  : 'Waiting for the customer to enter the session.'}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-200">
                <strong>Session Duration:</strong> {durationMinutes} minutes
              </p>
              <p className="mt-1 text-xs text-yellow-300">
                Timer starts when both participants join
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-300">{"You're connected and ready"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Both Joined Notification */}
      {bothJoinedNotification && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full border border-green-400/30 bg-green-500/20 px-6 py-3 text-green-200 shadow-lg backdrop-blur">
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
            <span className="text-sm font-semibold">Both participants joined - Session starting!</span>
          </div>
        </div>
      )}

      {/* Time Warning Notification */}
      {timeWarning && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/20 px-4 py-2 text-amber-200 shadow-lg backdrop-blur">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">{timeWarning}</span>
          </div>
        </div>
      )}

      {/* Session Header */}
      <div className="absolute left-4 right-4 top-4 z-[9999] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back to Dashboard */}
          <a
            href={dashboardUrl}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl transition hover:from-slate-800 hover:to-slate-700 hover:shadow-orange-500/50"
            title="Back to dashboard - You can return anytime"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Dashboard</span>
          </a>

          {sessionStarted && (
            <div className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur">
              <p className="text-sm text-slate-300">
                {mechanicPresent ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    Mechanic connected
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    Mechanic disconnected
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {sessionStarted && sessionStartTime && (
          <SessionTimer
            startTime={sessionStartTime}
            durationMinutes={durationMinutes}
            onTimeWarning={handleTimeWarning}
            onTimeUp={handleTimeUp}
          />
        )}
      </div>

      {/* Main Video Conference */}
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        video
        audio
        data-lk-theme="default"
        className="h-full w-full"
      >
        <ParticipantMonitor
          onMechanicJoined={handleMechanicJoined}
          onMechanicLeft={handleMechanicLeft}
          onCustomerJoined={handleCustomerJoined}
          onCustomerLeft={handleCustomerLeft}
        />
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Add More Time Footer */}
      {sessionStarted && (
        <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-900/90 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Need more time?</p>
              <p className="text-xs text-slate-400">Extend your session and continue without interruption</p>
            </div>
            <button
              onClick={() => setShowExtendModal(true)}
              className="rounded-full bg-gradient-to-r from-orange-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-indigo-400"
            >
              Add Time
            </button>
          </div>
        </div>
      )}

      {/* Extend Time Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white">Extend Your Session</h3>
            <p className="mt-2 text-sm text-slate-400">
              Choose additional time to continue your diagnostic session
            </p>

            <div className="mt-6 space-y-3">
              {TIME_EXTENSIONS.map((option) => (
                <button
                  key={option.duration}
                  onClick={() => handleExtendTime(option.duration, option.price)}
                  disabled={extendingSession}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">+{option.duration} minutes</p>
                      <p className="text-sm text-slate-400">Additional time</p>
                    </div>
                    <p className="text-lg font-bold text-orange-400">
                      ${(option.price / 100).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                disabled={extendingSession}
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
