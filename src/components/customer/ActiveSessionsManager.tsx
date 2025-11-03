'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, Video, MessageSquare, Clock, User, ArrowRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface ActiveSession {
  id: string
  plan: string
  planLabel: string
  type: 'chat' | 'video' | 'diagnostic'
  typeLabel: string
  status: string
  createdAt: string
  startedAt: string | null
  mechanicName: string | null
}

interface ActiveSessionsManagerProps {
  sessions: ActiveSession[]
}

export default function ActiveSessionsManager({ sessions: initialSessions }: ActiveSessionsManagerProps) {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<ActiveSession[]>(initialSessions)

  // Real-time subscription to detect when sessions end
  useEffect(() => {
    if (sessions.length === 0) return

    const sessionIds = sessions.map(s => s.id)
    console.log('[ActiveSessionsManager] Setting up real-time subscription for sessions:', sessionIds)

    const channel = supabase
      .channel('active-sessions-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=in.(${sessionIds.join(',')})`,
        },
        (payload) => {
          console.log('[ActiveSessionsManager] Session updated:', payload)
          const updated = payload.new as any

          // If session ended (completed/cancelled), remove it from display
          if (updated.status === 'completed' || updated.status === 'cancelled') {
            console.log('[ActiveSessionsManager] Session ended, removing from display:', updated.id)
            setSessions(prev => prev.filter(s => s.id !== updated.id))
          }
        }
      )
      .on(
        'broadcast',
        { event: 'session_completed' },
        (payload) => {
          console.log('[ActiveSessionsManager] Broadcast: Session completed:', payload)
          const { session_id } = payload.payload || {}

          // Remove completed session from display
          if (session_id) {
            console.log('[ActiveSessionsManager] Removing completed session from display:', session_id)
            setSessions(prev => prev.filter(s => s.id !== session_id))

            // Show notification to user
            if (typeof window !== 'undefined') {
              // Optionally show browser notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Session Ended', {
                  body: 'Your session has been completed.',
                  icon: '/favicon.ico'
                })
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[ActiveSessionsManager] Subscription status:', status)
      })

    return () => {
      console.log('[ActiveSessionsManager] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [sessions, supabase])

  // BUSINESS RULE: Customer can only have ONE active session at a time
  // Enforce this by only showing the first session
  if (sessions.length === 0) {
    return null
  }

  // Log warning if multiple sessions are passed (should never happen)
  if (sessions.length > 1) {
    console.error('[ActiveSessionsManager] WARNING: Multiple active sessions detected! Only showing first session.', sessions)
  }

  // Only show the FIRST active session (enforce business rule)
  const singleSession = sessions[0]!

  const visibleSessions = [singleSession]

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to end session. Please try again.')
      }
    } catch (error) {
      console.error('Error ending session:', error)
      alert('An error occurred. Please try again.')
    }
  }

  return (
    <div className="rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4 sm:p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shrink-0">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-green-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Active Session</h2>
            <p className="text-xs sm:text-sm text-green-300">
              Session in progress
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {visibleSessions.map((session) => (
          <div
            key={session.id}
            className="group relative overflow-hidden rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-4 sm:p-5 shadow-lg backdrop-blur transition hover:border-green-400/50"
          >
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Pulsing Icon */}
                <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-green-500">
                    {session.type === 'video' ? (
                      <Video className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    ) : (
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    )}
                  </span>
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-white truncate">{session.planLabel}</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      Live Now
                    </span>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-green-200">
                    <span>{session.typeLabel}</span>
                    {session.mechanicName && (
                      <>
                        <span className="text-green-400">·</span>
                        <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="truncate">{session.mechanicName}</span>
                      </>
                    )}
                  </p>

                  {session.startedAt && (
                    <p className="mt-1 flex items-center gap-1 sm:gap-1.5 text-xs text-green-300">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Started {new Date(session.startedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 w-full">
                <Link
                  href={
                    session.type === 'chat'
                      ? `/chat/${session.id}`
                      : `/video/${session.id}`
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="truncate">Return to Session</span>
                </Link>

                <button
                  onClick={() => handleEndSession(session.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/50 bg-red-500/10 px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                  End Session
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 sm:mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-2.5 sm:p-3">
        <p className="text-xs sm:text-sm text-green-200">
          <strong>Tip:</strong> Your session will remain active until you or the mechanic ends it. Don&apos;t forget to end
          the session when you&apos;re done to ensure accurate billing.
        </p>
      </div>
    </div>
  )
}
