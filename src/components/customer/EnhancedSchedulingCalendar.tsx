'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { X, Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle, Edit2, Trash2 } from 'lucide-react'

type SessionStatus = 'pending' | 'waiting' | 'scheduled' | 'live' | 'completed' | 'cancelled'
type PlanKey = 'chat10' | 'video15' | 'diagnostic' | 'free' | 'trial'

export type SessionEvent = {
  id: string
  title?: string
  start: Date
  end: Date
  status: SessionStatus
  plan: PlanKey
  type: string
  mechanic_name?: string
  resource?: any
}

type EnhancedSchedulingCalendarProps = {
  initialEvents?: Array<{
    id: string
    start: string
    end: string
    status: SessionStatus
    plan: PlanKey
    type: string
  }>
  plan?: PlanKey | null
  onSessionCreated?: () => void
}

const STATUS_COLORS: Record<SessionStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900' },
  waiting: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-900' },
  scheduled: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-900' },
  live: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  completed: { bg: 'bg-gray-400', border: 'border-gray-500', text: 'text-gray-900' },
  cancelled: { bg: 'bg-gray-600', border: 'border-gray-700', text: 'text-white' },
}

const PLAN_LABELS: Record<PlanKey, string> = {
  chat10: 'Quick Chat',
  video15: 'Standard Video',
  diagnostic: 'Full Diagnostic',
  free: 'Free Session',
  trial: 'Trial Session',
}

export default function EnhancedSchedulingCalendar({
  initialEvents,
  plan,
  onSessionCreated,
}: EnhancedSchedulingCalendarProps) {
  const router = useRouter()
  const [calendarComponents, setCalendarComponents] = useState<{
    Calendar: any
    localizer: any
  } | null>(null)

  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Load calendar library
  useEffect(() => {
    import('react-big-calendar').then((mod) => {
      const localizer = (mod as any).dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
        getDay,
        locales: { 'en-US': enUS },
      })

      setCalendarComponents({
        Calendar: mod.Calendar,
        localizer,
      })
    })
  }, [])

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/customer/sessions')
      if (!res.ok) throw new Error('Failed to fetch sessions')

      const data = await res.json()
      const formattedSessions: SessionEvent[] = (data.sessions || [])
        .filter((s: any) => s.scheduled_start && s.scheduled_end)
        .map((s: any) => ({
          id: s.id,
          title: `${PLAN_LABELS[s.plan as PlanKey] || s.plan} - ${s.status}`,
          start: new Date(s.scheduled_start),
          end: new Date(s.scheduled_end),
          status: s.status,
          plan: s.plan,
          type: s.type,
          mechanic_name: s.mechanic_name,
        }))

      setSessions(formattedSessions)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Handle new booking
  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    const now = new Date()
    if (slotInfo.start < now) {
      alert('Cannot book sessions in the past')
      return
    }

    setSelectedSlot(slotInfo)
  }

  const confirmBooking = async () => {
    if (!selectedSlot || !plan) return

    try {
      setActionLoading(true)

      // Save schedule preference
      const res = await fetch('/api/customer/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          date: selectedSlot.start.toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Failed to save schedule')

      // Redirect to intake to complete booking
      router.push(`/intake?plan=${plan}&scheduled_time=${selectedSlot.start.toISOString()}`)

      onSessionCreated?.()
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setActionLoading(false)
      setSelectedSlot(null)
    }
  }

  // Handle reschedule
  const handleReschedule = async (newTime: Date) => {
    if (!selectedEvent) return

    try {
      setActionLoading(true)

      const res = await fetch(`/api/customer/sessions/${selectedEvent.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_scheduled_time: newTime.toISOString(),
          reason: 'Customer requested reschedule',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reschedule')
      }

      alert('Session rescheduled successfully!')
      setSelectedEvent(null)
      fetchSessions()
    } catch (error: any) {
      alert(error.message || 'Failed to reschedule session')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle cancel
  const handleCancel = async () => {
    if (!selectedEvent) return

    const confirmed = confirm(
      'Are you sure you want to cancel this session? Cancellation policy applies:\n' +
      '• More than 24 hours: 100% refund\n' +
      '• 2-24 hours: 50% refund\n' +
      '• Less than 2 hours: No refund'
    )

    if (!confirmed) return

    try {
      setActionLoading(true)

      const res = await fetch(`/api/customer/sessions/${selectedEvent.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer cancelled',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to cancel')
      }

      const result = await res.json()
      alert(result.message + '\n' + result.refund_note)

      setSelectedEvent(null)
      fetchSessions()
    } catch (error: any) {
      alert(error.message || 'Failed to cancel session')
    } finally {
      setActionLoading(false)
    }
  }

  // Custom event styling
  const eventStyleGetter = (event: SessionEvent) => {
    const colors = STATUS_COLORS[event.status]
    return {
      style: {
        backgroundColor: colors.bg.replace('bg-', 'rgb(var(--'),
        borderLeft: `4px solid`,
        borderColor: colors.border.replace('border-', 'rgb(var(--'),
        color: colors.text.replace('text-', 'rgb(var(--'),
      },
    }
  }

  if (!calendarComponents) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <span className="ml-3 text-sm text-slate-400">Loading calendar...</span>
        </div>
      </div>
    )
  }

  const { Calendar, localizer } = calendarComponents

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 shadow-sm backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <span className="ml-3 text-sm text-slate-400">Loading sessions...</span>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={sessions}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={['month', 'week', 'day']}
            selectable
            style={{ height: 600 }}
            onSelectEvent={(event: SessionEvent) => setSelectedEvent(event)}
            onSelectSlot={handleSlotSelect}
            eventPropGetter={eventStyleGetter}
          />
        )}
      </div>

      {/* New Booking Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Book New Session</h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CalendarIcon className="h-4 w-4 text-orange-500" />
                  <span>{format(selectedSlot.start, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300 mt-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>
                    {format(selectedSlot.start, 'h:mm a')} - {format(selectedSlot.end, 'h:mm a')}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  <strong className="text-white">Plan:</strong> {plan ? PLAN_LABELS[plan] : 'No plan selected'}
                </div>
              </div>

              {!plan && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200">
                      Please select a plan before booking a session.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBooking}
                  disabled={!plan || actionLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Continue to Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Session Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedEvent.status].bg} ${STATUS_COLORS[selectedEvent.status].text} mb-3`}>
                  {selectedEvent.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                  {selectedEvent.status === 'live' && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                  {selectedEvent.status.toUpperCase()}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-400">Plan:</span>
                    <span className="ml-2 text-white font-medium">{PLAN_LABELS[selectedEvent.plan]}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Date:</span>
                    <span className="ml-2 text-white">{format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Time:</span>
                    <span className="ml-2 text-white">
                      {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                    </span>
                  </div>
                  {selectedEvent.mechanic_name && (
                    <div>
                      <span className="text-slate-400">Mechanic:</span>
                      <span className="ml-2 text-white">{selectedEvent.mechanic_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {['pending', 'scheduled', 'waiting'].includes(selectedEvent.status) && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const newTime = prompt('Enter new date/time (YYYY-MM-DD HH:mm):')
                      if (newTime) {
                        handleReschedule(new Date(newTime))
                      }
                    }}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Reschedule
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel Session
                  </button>
                </div>
              )}

              {selectedEvent.status === 'live' && (
                <button
                  onClick={() => router.push(`/video/${selectedEvent.id}`)}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 transition"
                >
                  Join Session
                </button>
              )}

              {selectedEvent.status === 'completed' && (
                <button
                  onClick={() => router.push(`/customer/sessions/${selectedEvent.id}`)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
