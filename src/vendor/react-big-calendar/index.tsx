'use client'

import type { CSSProperties, ReactNode } from 'react'
import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  set,
  startOfDay,
  startOfMonth,
} from '../date-fns'

type CalendarEvent = {
  id?: string
  title?: string
  start: Date
  end: Date
  resource?: unknown
  [key: string]: unknown
}

type View = 'month' | 'week' | 'day'

export const Views: Record<'MONTH' | 'WEEK' | 'DAY', View> = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
}

type Localizer = {
  format: (date: Date, formatStr: string, options?: { locale?: { code?: string } }) => string
  parse: (value: string, formatStr: string, referenceDate: Date) => Date
  startOfWeek: (date: Date) => Date
  getDay: (date: Date) => number
  locales?: Record<string, unknown>
}

type SlotInfo = {
  start: Date
  end: Date
  slots: Date[]
  action: 'select' | 'click'
  resourceId?: string | number
}

type NavigateAction = 'TODAY' | 'PREV' | 'NEXT'

type CalendarProps<E extends CalendarEvent = CalendarEvent> = {
  events: readonly E[]
  localizer: Localizer
  defaultDate?: Date
  date?: Date
  view?: View
  defaultView?: View
  views?: readonly View[]
  selectable?: boolean
  step?: number
  timeslots?: number
  min?: Date
  max?: Date
  className?: string
  style?: CSSProperties
  onNavigate?: (date: Date, view: View, action: NavigateAction) => void
  onView?: (view: View) => void
  onSelectSlot?: (slot: SlotInfo) => void
  onSelectEvent?: (event: E) => void
}

type ToolbarProps = {
  date: Date
  view: View
  views: readonly View[]
  onNavigate: (action: NavigateAction) => void
  onView: (view: View) => void
  localizer: Localizer
}

type MonthViewProps<E extends CalendarEvent> = {
  date: Date
  events: readonly E[]
  localizer: Localizer
  selectable: boolean
  onSelectSlot?: (slot: SlotInfo) => void
  onSelectEvent?: (event: E) => void
  step: number
}

type WeekViewProps<E extends CalendarEvent> = {
  date: Date
  events: readonly E[]
  localizer: Localizer
  selectable: boolean
  onSelectSlot?: (slot: SlotInfo) => void
  onSelectEvent?: (event: E) => void
  step: number
  timeslots: number
  minHour: number
  maxHour: number
  view: View
}

export function dateFnsLocalizer(config: Localizer): Localizer {
  return config
}

function buildClassName(base: string, extra?: string): string {
  return [base, extra].filter(Boolean).join(' ')
}

function Toolbar({ date, view, views, onNavigate, onView, localizer }: ToolbarProps) {
  const label = useMemo(() => {
    if (view === 'month') {
      return localizer.format(date, 'MMMM yyyy')
    }
    if (view === 'week') {
      const start = localizer.startOfWeek(date)
      const end = addDays(start, 6)
      return `${localizer.format(start, 'MMM d')} – ${localizer.format(end, 'MMM d, yyyy')}`
    }
    return localizer.format(date, 'EEEE, MMMM d')
  }, [date, localizer, view])

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" className="rbc-btn" onClick={() => onNavigate('PREV')}>
          Prev
        </button>
        <button type="button" className="rbc-btn" onClick={() => onNavigate('TODAY')}>
          Today
        </button>
        <button type="button" className="rbc-btn" onClick={() => onNavigate('NEXT')}>
          Next
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group">
        {views.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className="rbc-btn"
            aria-pressed={candidate === view}
            onClick={() => onView(candidate)}
          >
            {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
          </button>
        ))}
      </span>
    </div>
  )
}

function MonthView<E extends CalendarEvent>({
  date,
  events,
  localizer,
  selectable,
  onSelectSlot,
  onSelectEvent,
  step,
}: MonthViewProps<E>) {
  const monthStart = startOfMonth(date)
  const firstDisplayed = localizer.startOfWeek(monthStart)
  const totalDays = 42 // 6 weeks grid

  const handleSelect = useCallback(
    (day: Date) => {
      if (!selectable || !onSelectSlot) return
      const slotStart = startOfDay(day)
      const slotEnd = addMinutes(slotStart, step)
      onSelectSlot({
        start: slotStart,
        end: slotEnd,
        slots: [slotStart],
        action: 'select',
      })
    },
    [onSelectSlot, selectable, step],
  )

  return (
    <div className="rbc-month-view">
      <div className="rbc-day-headers">
        {Array.from({ length: 7 }).map((_, index) => {
          const weekday = addDays(localizer.startOfWeek(new Date()), index)
          return (
            <div key={index} className="rbc-day-header">
              {localizer.format(weekday, 'EEE')}
            </div>
          )
        })}
      </div>
      <div className="rbc-month-body">
        {Array.from({ length: totalDays }).map((_, index) => {
          const day = addDays(firstDisplayed, index)
          const isOffRange = !isSameMonth(day, date)
          const isToday = isSameDay(day, new Date())
          const dayEvents = events.filter((event) => isSameDay(event.start, day))

          const cellClass = buildClassName('rbc-month-cell', [isOffRange ? 'rbc-off-range' : '', isToday ? 'rbc-today' : ''].join(' ').trim())

          return (
            <div key={day.getTime()} className={cellClass} onClick={() => handleSelect(day)}>
              <div className="rbc-date-cell">{localizer.format(day, 'd')}</div>
              <div className="rbc-events-container">
                {dayEvents.map((event, idx) => (
                  <div
                    key={event.id ?? idx}
                    className="rbc-event"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEvent?.(event)
                    }}
                  >
                    {event.title ?? localizer.format(event.start, 'h:mm a')}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView<E extends CalendarEvent>({
  date,
  events,
  localizer,
  selectable,
  onSelectSlot,
  onSelectEvent,
  step,
  timeslots,
  minHour,
  maxHour,
  view,
}: WeekViewProps<E>) {
  const start = view === 'day' ? startOfDay(date) : localizer.startOfWeek(date)
  const days = view === 'day' ? 1 : 7
  const slotMinutes = step
  const slotsPerHour = Math.max(1, Math.round(60 / slotMinutes))
  const totalSlots = (maxHour - minHour) * slotsPerHour
  const slotHeight = 48 / (60 / slotMinutes)

  const hours = Array.from({ length: maxHour - minHour + 1 }).map((_, idx) => minHour + idx)

  const handleSlotSelect = useCallback(
    (day: Date, slotIndex: number) => {
      if (!selectable || !onSelectSlot) return
      const minutesFromStart = slotIndex * slotMinutes
      const slotStart = addMinutes(set(day, { hours: minHour, minutes: 0, seconds: 0, milliseconds: 0 }), minutesFromStart)
      const slotEnd = addMinutes(slotStart, slotMinutes * Math.max(1, timeslots))
      onSelectSlot({
        start: slotStart,
        end: slotEnd,
        slots: [slotStart],
        action: 'select',
      })
    },
    [minHour, onSelectSlot, selectable, slotMinutes, timeslots],
  )

  return (
    <div className="rbc-week-view">
      <div className="rbc-time-view">
        <div className="rbc-time-gutter">
          {hours.map((hour) => (
            <div key={hour} className="rbc-time-slot">
              {localizer.format(set(start, { hours: hour, minutes: 0 }), 'h a')}
            </div>
          ))}
        </div>
        <div className="rbc-time-content">
          {Array.from({ length: days }).map((_, dayIndex) => {
            const day = addDays(start, dayIndex)
            const dayStart = set(day, { hours: minHour, minutes: 0, seconds: 0, milliseconds: 0 })
            const dayEnd = set(day, { hours: maxHour, minutes: 0, seconds: 0, milliseconds: 0 })
            const dayEvents = events.filter((event) =>
              (isAfter(event.end, dayStart) || isSameDay(event.end, dayStart)) &&
              (isBefore(event.start, dayEnd) || isSameDay(event.start, dayEnd)),
            )

            return (
              <div key={day.getTime()} className="rbc-day-column">
                {Array.from({ length: totalSlots }).map((_, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="rbc-time-slot"
                    onClick={() => handleSlotSelect(day, slotIndex)}
                  />
                ))}
                {dayEvents.map((event, idx) => {
                  const eventStart = isBefore(event.start, dayStart) ? dayStart : event.start
                  const eventEnd = isAfter(event.end, endOfDay(day)) ? endOfDay(day) : event.end
                  const minutesFromStart = differenceInMinutes(eventStart, dayStart)
                  const minutesLength = Math.max(slotMinutes, differenceInMinutes(eventEnd, eventStart))
                  const top = (minutesFromStart / slotMinutes) * slotHeight
                  const height = Math.max(slotHeight, (minutesLength / slotMinutes) * slotHeight)

                  return (
                    <div
                      key={event.id ?? idx}
                      className="rbc-event"
                      style={{ top, height }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent?.(event)
                      }}
                    >
                      <div>{event.title ?? localizer.format(event.start, 'h:mm a')}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                        {localizer.format(event.start, 'h:mm a')} – {localizer.format(event.end, 'h:mm a')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Calendar<E extends CalendarEvent = CalendarEvent>({
  events,
  localizer,
  defaultDate,
  date: controlledDate,
  defaultView,
  view: controlledView,
  views,
  selectable = false,
  step = 30,
  timeslots = 1,
  min,
  max,
  className,
  style,
  onNavigate,
  onView,
  onSelectSlot,
  onSelectEvent,
}: CalendarProps<E>) {
  const availableViews = views && views.length > 0 ? views : (['month', 'week', 'day'] as const)
  const initialView = controlledView ?? defaultView ?? availableViews[0] ?? 'month'
  const initialDate = controlledDate ?? defaultDate ?? new Date()

  const [currentView, setCurrentView] = useState<View>(initialView)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)

  useEffect(() => {
    if (controlledView && controlledView !== currentView) {
      setCurrentView(controlledView)
    }
  }, [controlledView, currentView])

  useEffect(() => {
    if (controlledDate && controlledDate.getTime() !== currentDate.getTime()) {
      setCurrentDate(controlledDate)
    }
  }, [controlledDate, currentDate])

  const normalizedEvents = useMemo(() => events.map((event) => ({
    ...event,
    start: event.start instanceof Date ? event.start : new Date(event.start),
    end: event.end instanceof Date ? event.end : new Date(event.end),
  })), [events])

  const resolvedMinHour = min instanceof Date ? min.getHours() : 8
  const resolvedMaxHour = max instanceof Date ? max.getHours() : 18

  const handleNavigate = useCallback(
    (action: NavigateAction) => {
      let nextDate = currentDate
      if (action === 'TODAY') {
        nextDate = new Date()
      } else if (currentView === 'month') {
        nextDate = addMonths(currentDate, action === 'NEXT' ? 1 : -1)
      } else if (currentView === 'week') {
        nextDate = addWeeks(currentDate, action === 'NEXT' ? 1 : -1)
      } else {
        nextDate = addDays(currentDate, action === 'NEXT' ? 1 : -1)
      }
      setCurrentDate(nextDate)
      onNavigate?.(nextDate, currentView, action)
    },
    [currentDate, currentView, onNavigate],
  )

  const handleViewChange = useCallback(
    (view: View) => {
      setCurrentView(view)
      onView?.(view)
    },
    [onView],
  )

  const viewElement: ReactNode = useMemo(() => {
    if (currentView === 'month') {
      return (
        <MonthView
          date={currentDate}
          events={normalizedEvents}
          localizer={localizer}
          selectable={selectable}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          step={step}
        />
      )
    }

    return (
      <WeekView
        date={currentDate}
        events={normalizedEvents}
        localizer={localizer}
        selectable={selectable}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        step={step}
        timeslots={timeslots}
        minHour={resolvedMinHour}
        maxHour={resolvedMaxHour}
        view={currentView}
      />
    )
  }, [currentDate, currentView, localizer, normalizedEvents, onSelectEvent, onSelectSlot, resolvedMaxHour, resolvedMinHour, selectable, step, timeslots])

  return (
    <div className={buildClassName('rbc-calendar', className)} style={style}>
      <Toolbar date={currentDate} view={currentView} views={availableViews} onNavigate={handleNavigate} onView={handleViewChange} localizer={localizer} />
      <div className="rbc-view-container">{viewElement}</div>
    </div>
  )
}

export type { CalendarEvent, CalendarProps, Localizer, SlotInfo, View }
