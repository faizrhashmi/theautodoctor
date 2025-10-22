'use client'

import Link from 'next/link'
import { Activity, Video, MessageSquare, Clock, User, ArrowRight, X } from 'lucide-react'

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

export default function ActiveSessionsManager({ sessions }: ActiveSessionsManagerProps) {
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
    <div className="rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
            <Activity className="h-6 w-6 text-white" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Active Session</h2>
            <p className="text-sm text-green-300">
              Session in progress
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {visibleSessions.map((session) => (
          <div
            key={session.id}
            className="group relative overflow-hidden rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-5 shadow-lg backdrop-blur transition hover:border-green-400/50"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                {/* Pulsing Icon */}
                <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                    {session.type === 'video' ? (
                      <Video className="h-5 w-5 text-white" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-white" />
                    )}
                  </span>
                </div>

                {/* Session Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{session.planLabel}</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      Live Now
                    </span>
                  </div>

                  <p className="mt-1 flex items-center gap-2 text-sm text-green-200">
                    <span>{session.typeLabel}</span>
                    {session.mechanicName && (
                      <>
                        <span className="text-green-400">·</span>
                        <User className="h-3.5 w-3.5" />
                        <span>{session.mechanicName}</span>
                      </>
                    )}
                  </p>

                  {session.startedAt && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-green-300">
                      <Clock className="h-3.5 w-3.5" />
                      Started {new Date(session.startedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  href={session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Return to Session
                </Link>

                <button
                  onClick={() => handleEndSession(session.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                  End Session
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
        <p className="text-xs text-green-200">
          <strong>Tip:</strong> Your session will remain active until you or the mechanic ends it. Don't forget to end
          the session when you're done to ensure accurate billing.
        </p>
      </div>
    </div>
  )
}
