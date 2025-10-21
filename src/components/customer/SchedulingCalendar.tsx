'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Views, dateFnsLocalizer, type SlotInfo, type View } from 'react-big-calendar'
import { addMinutes, format, parse, startOfWeek, getDay } from 'date-fns'
import { PRICING, type PlanKey } from '@/config/pricing'

type SchedulingEvent = {
  id: string
  start: string
  end: string
  status: string
  plan: PlanKey
  type: string
}

type CalendarEvent = {
  id: string
  title: string
  status: string
  plan: PlanKey
  type: string
  start: Date
  end: Date
}

type SchedulingCalendarProps = {
  initialEvents: SchedulingEvent[]
  plan: PlanKey | null
}

const locales = {
  'en-US': { code: 'en-US' },
}

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const SCHEDULABLE_PLANS: PlanKey[] = ['video15', 'diagnostic']

function getDurationForPlan(plan: PlanKey | null): number {
  switch (plan) {
    case 'diagnostic':
      return 60
    case 'video15':
      return 45
    default:
      return 30
  }
}

function createCalendarEvent(event: SchedulingEvent): CalendarEvent | null {
  if (!event.start || !event.end) {
    return null
  }
  const startDate = new Date(event.start)
  const endDate = new Date(event.end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }

  const planName = PRICING[event.plan]?.name ?? 'Session'

  return {
    id: event.id,
    plan: event.plan,
    status: event.status,
    type: event.type,
    title: `${planName}`,
    start: startDate,
    end: endDate,
  }
}

function buildEventTitle(event: CalendarEvent) {
  const statusLabel = event.status === 'scheduled' ? 'Scheduled' : event.status
  const planName = PRICING[event.plan]?.name ?? 'Session'
  return `${planName} • ${statusLabel ?? ''}`.trim()
}

export function SchedulingCalendar({ initialEvents, plan }: SchedulingCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    initialEvents
      .map(createCalendarEvent)
      .filter((event): event is CalendarEvent => Boolean(event)),
  )
  const [view, setView] = useState<View>(Views.WEEK)
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0])
    }
  }, [events, selectedEvent])

  const selectable = plan ? SCHEDULABLE_PLANS.includes(plan) : false
  const durationMinutes = getDurationForPlan(plan)

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        title: buildEventTitle(event),
      })),
    [events],
  )

  const upcomingList = useMemo(
    () =>
      [...events]
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .filter((event) => event.end.getTime() >= Date.now()),
    [events],
  )

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!selectable) {
      return
    }
    const start = slotInfo.start
    const adjustedEnd = addMinutes(start, durationMinutes)
    setPendingSlot({ start, end: adjustedEnd })
    setError(null)
  }

  const handleCreateBooking = async () => {
    if (!pendingSlot || !plan) {
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/customer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: pendingSlot.start.toISOString(),
          end: pendingSlot.end.toISOString(),
          plan,
          timezone,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        throw new Error((payload as any)?.error ?? 'Unable to create booking')
      }

      const result = payload as {
        booking: { id: string; start: string; end: string; status: string; plan: PlanKey; type: string }
      }

      const created = createCalendarEvent({
        id: result.booking.id,
        start: result.booking.start,
        end: result.booking.end,
        status: result.booking.status,
        plan: result.booking.plan,
        type: result.booking.type,
      })

      if (created) {
        setEvents((prev) => [...prev, created])
        setPendingSlot(null)
        setSelectedEvent(created)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const minTime = useMemo(() => {
    const date = new Date()
    date.setHours(7, 0, 0, 0)
    return date
  }, [])

  const maxTime = useMemo(() => {
    const date = new Date()
    date.setHours(21, 0, 0, 0)
    return date
  }, [])

  return (
    <div className="space-y-6">
      {!selectable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Upgrade to the Standard Video or Full Diagnostic plan to reserve a live session.
        </div>
      )}
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        defaultView={Views.WEEK}
        view={view}
        onView={(nextView) => setView(nextView)}
        views={[Views.WEEK, Views.DAY, Views.MONTH]}
        selectable={selectable}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
        style={{ height: '75vh' }}
        step={15}
        timeslots={2}
        min={minTime}
        max={maxTime}
      />

      {pendingSlot && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Confirm session</h2>
            <p className="mt-2 text-sm text-slate-600">
              {PRICING[plan!]?.name ?? 'Session'} in {timezone}
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Start</span>
                <span className="font-medium">{format(pendingSlot.start, 'EEEE, MMM d • h:mm a')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>End</span>
                <span className="font-medium">{format(pendingSlot.end, 'EEEE, MMM d • h:mm a')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Duration</span>
                <span className="font-medium">{durationMinutes} minutes</span>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => setPendingSlot(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-400"
                onClick={handleCreateBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Upcoming reservations</h3>
          {upcomingList.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No scheduled sessions yet. Select a time on the calendar to reserve.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {upcomingList.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-900">{PRICING[event.plan]?.name ?? 'Session'}</p>
                    <p className="text-xs text-slate-500">
                      {format(event.start, 'EEEE, MMM d')} · {format(event.start, 'h:mm a')} – {format(event.end, 'h:mm a')}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {event.status === 'scheduled' ? 'Scheduled' : event.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Session details</h3>
          {selectedEvent ? (
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">{PRICING[selectedEvent.plan]?.name ?? 'Session'}</p>
                <p>{selectedEvent.status === 'scheduled' ? 'Awaiting confirmation with a mechanic.' : selectedEvent.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">When</p>
                <p>{format(selectedEvent.start, 'EEEE, MMM d • h:mm a')} – {format(selectedEvent.end, 'h:mm a')} ({timezone})</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Session type</p>
                <p className="capitalize">{selectedEvent.type}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Select an event to view the session summary.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SchedulingCalendar
