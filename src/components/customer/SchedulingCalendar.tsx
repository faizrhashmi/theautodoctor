'use client'

import { useMemo, useState, useEffect } from 'react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'

// ---- Minimal local types (avoid RBG type imports) ----
type RBCView = 'month' | 'week' | 'work_week' | 'day' | 'agenda'
export type CalendarEvent = {
  id?: string | number
  title?: string
  start: Date
  end: Date
  // your extra fields:
  status?: string
  plan?: unknown
  type?: unknown
  [k: string]: unknown
}

type SchedulingCalendarProps = {
  /** Pass fully-typed events with Date start/end */
  events?: CalendarEvent[]
  /** Or pass ISO string events; we'll convert to Date */
  initialEvents?: Array<{
    id?: string | number
    title?: string
    start: string
    end: string
    status?: string
    plan?: unknown
    type?: unknown
    [k: string]: unknown
  }>
  plan?: unknown
  defaultView?: RBCView
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slot: { start: Date; end: Date }) => void
}

export default function SchedulingCalendar({
  events,
  initialEvents,
  plan,
  defaultView = 'week',
  onSelectEvent,
  onSelectSlot,
}: SchedulingCalendarProps) {
  const [calendarComponents, setCalendarComponents] = useState<{
    Calendar: any
    localizer: any
  } | null>(null)

  // Load calendar on client side only
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

  const normalizedEvents: CalendarEvent[] = useMemo(() => {
    if (events && events.length) return events
    return (initialEvents ?? []).map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
      plan: e.plan ?? plan,
    }))
  }, [events, initialEvents, plan])

  // Show loading state while calendar loads
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
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 shadow-sm backdrop-blur-sm">
      <Calendar
        localizer={localizer}
        events={normalizedEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        selectable
        style={{ height: 600 }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={(slotInfo: { start: Date; end: Date }) =>
          onSelectSlot?.({ start: slotInfo.start as Date, end: slotInfo.end as Date })
        }
      />
    </div>
  )
}
