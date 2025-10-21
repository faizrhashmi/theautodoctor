'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
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
  /** Or pass ISO string events; we’ll convert to Date */
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

// Dynamically import Calendar + localizer to avoid SSR/window issues
const Dyn = dynamic(async () => {
  const mod = await import('react-big-calendar')
  const localizer = (mod as any).dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
    getDay,
    locales: { 'en-US': enUS },
  })
  return Object.assign(
    (props: any) => {
      const C = (mod as any).Calendar
      return <C {...props} />
    },
    { localizer }
  )
}, { ssr: false }) as unknown as ((
  props: any
) => JSX.Element) & { localizer: any }

export default function SchedulingCalendar({
  events,
  initialEvents,
  plan,
  defaultView = 'week',
  onSelectEvent,
  onSelectSlot,
}: SchedulingCalendarProps) {
  const localizer = useMemo(() => (Dyn as any).localizer, [])

  const normalizedEvents: CalendarEvent[] = useMemo(() => {
    if (events && events.length) return events
    return (initialEvents ?? []).map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
      plan: e.plan ?? plan,
    }))
  }, [events, initialEvents, plan])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Dyn
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
