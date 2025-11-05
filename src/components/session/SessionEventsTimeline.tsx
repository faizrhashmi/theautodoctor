'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Wrench,
  LogIn,
  LogOut,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react'

interface SessionEvent {
  id: string
  session_id: string
  event_type: string
  user_id: string | null
  mechanic_id: string | null
  created_at: string
  metadata: Record<string, any>
}

interface SessionEventsTimelineProps {
  sessionId: string
  showMetadata?: boolean
}

const EVENT_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  created: {
    icon: Play,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    label: 'Session Created'
  },
  assigned: {
    icon: User,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    label: 'Mechanic Assigned'
  },
  mechanic_accepted: {
    icon: CheckCircle,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    label: 'Mechanic Accepted'
  },
  joined: {
    icon: LogIn,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    label: 'Joined Session'
  },
  started: {
    icon: Play,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    label: 'Session Started'
  },
  ended: {
    icon: CheckCircle,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    label: 'Session Ended'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    label: 'Session Cancelled'
  },
  left: {
    icon: LogOut,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    label: 'Left Session'
  },
  waiting: {
    icon: Clock,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    label: 'Waiting for Participant'
  }
}

export function SessionEventsTimeline({ sessionId, showMetadata = false }: SessionEventsTimelineProps) {
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const response = await fetch(`/api/sessions/${sessionId}/events`)

        if (!response.ok) {
          throw new Error('Failed to fetch session events')
        }

        const data = await response.json()
        setEvents(data.events || [])
      } catch (err) {
        console.error('[SessionEventsTimeline] Error fetching events:', err)
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
        <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No events recorded for this session yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[21px] top-6 bottom-0 w-0.5 bg-slate-700"></div>

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => {
            const config = EVENT_CONFIG[event.event_type] || {
              icon: AlertCircle,
              color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
              label: event.event_type
            }
            const Icon = config.icon

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-11 h-11 rounded-full border flex items-center justify-center z-10 ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{config.label}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Actor badge */}
                      {(event.user_id || event.mechanic_id) && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
                          {event.mechanic_id ? (
                            <>
                              <Wrench className="h-3 w-3 text-blue-400" />
                              <span className="text-xs text-slate-300">Mechanic</span>
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-slate-300">Customer</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {showMetadata && event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-3 rounded bg-slate-800/50 p-3">
                        <p className="text-xs text-slate-400 font-medium mb-2">Event Details:</p>
                        <dl className="space-y-1 text-xs">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <dt className="text-slate-500 font-medium">{key}:</dt>
                              <dd className="text-slate-300">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
