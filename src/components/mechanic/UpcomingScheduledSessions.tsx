'use client'

/**
 * UpcomingScheduledSessions - Display upcoming scheduled sessions for mechanics
 *
 * Features:
 * - Shows next 5 scheduled sessions
 * - Real-time countdown to session start
 * - Waiver status indicator
 * - Quick join button when session is ready
 * - Alert for sessions starting soon
 */

import { useState, useEffect } from 'react'
import { Calendar, Clock, Video, Wrench, AlertCircle, CheckCircle, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ScheduledSession {
  id: string
  customer_name: string
  customer_email: string
  scheduled_for: string
  type: string
  waiver_signed_at: string | null
  concern_description: string | null
  vehicle_info: string | null
}

export default function UpcomingScheduledSessions() {
  const router = useRouter()
  const [sessions, setSessions] = useState<ScheduledSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Fetch upcoming sessions
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/mechanic/scheduled-sessions')
      const data = await response.json()
      if (data.success) {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('[UpcomingScheduledSessions] Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeUntilSession = (scheduledFor: string) => {
    const sessionTime = new Date(scheduledFor)
    const diff = sessionTime.getTime() - currentTime.getTime()

    if (diff < 0) {
      return { text: 'Session time passed', isUrgent: true, isPast: true }
    }

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return { text: `in ${days}d ${hours % 24}h`, isUrgent: false, isPast: false }
    } else if (hours > 0) {
      return { text: `in ${hours}h ${minutes % 60}m`, isUrgent: hours < 1, isPast: false }
    } else if (minutes > 0) {
      return { text: `in ${minutes}m`, isUrgent: minutes <= 15, isPast: false }
    } else {
      return { text: 'Starting now!', isUrgent: true, isPast: false }
    }
  }

  const formatSessionTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  }

  const canJoinSession = (scheduledFor: string, waiverSignedAt: string | null) => {
    const sessionTime = new Date(scheduledFor)
    const tenMinutesBefore = new Date(sessionTime.getTime() - 10 * 60000)
    return currentTime >= tenMinutesBefore && waiverSignedAt !== null
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Scheduled Sessions</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-950/50 rounded-lg h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Scheduled Sessions</h2>
        </div>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No upcoming scheduled sessions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Scheduled Sessions</h2>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
          {sessions.length} scheduled
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const timeUntil = getTimeUntilSession(session.scheduled_for)
          const formatted = formatSessionTime(session.scheduled_for)
          const canJoin = canJoinSession(session.scheduled_for, session.waiver_signed_at)
          const SessionIcon = session.type === 'video' ? Video : Wrench

          return (
            <div
              key={session.id}
              className={`
                bg-slate-950/50 border rounded-lg p-4 transition-all
                ${timeUntil.isUrgent
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/10'
                  : 'border-slate-800 hover:border-slate-700'
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <SessionIcon className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">
                      {session.customer_name}
                    </span>
                    {session.waiver_signed_at ? (
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" title="Waiver signed" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" title="Waiver not signed yet" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatted.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatted.time}
                    </span>
                  </div>

                  {session.concern_description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {session.concern_description}
                    </p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`
                      text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap
                      ${timeUntil.isUrgent
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-slate-800 text-slate-400'
                      }
                    `}
                  >
                    {timeUntil.text}
                  </span>

                  {canJoin && (
                    <button
                      onClick={() => router.push(`/mechanic/sessions/${session.id}`)}
                      className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition"
                    >
                      Join Now
                    </button>
                  )}
                </div>
              </div>

              {/* Waiver Warning */}
              {!session.waiver_signed_at && timeUntil.isUrgent && !timeUntil.isPast && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">
                      Customer has not signed the waiver yet. Session will be auto-cancelled if waiver is not signed 10 minutes after start time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
