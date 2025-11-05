'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react'

type SessionStatus = 'pending' | 'waiting' | 'scheduled' | 'live' | 'completed' | 'cancelled'
type PlanKey = 'chat10' | 'video15' | 'diagnostic' | 'free' | 'trial'

type SessionEvent = {
  id: string
  start: Date
  end: Date
  status: SessionStatus
  plan: PlanKey
  type: string
}

type ModernSchedulingCalendarProps = {
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
  activeSession?: {
    id: string
    status: string
    type: string
    scheduled_start?: string
    scheduled_end?: string
    created_at: string
  } | null
}

const PLAN_LABELS: Record<PlanKey, string> = {
  chat10: 'Quick Chat',
  video15: 'Standard Video',
  diagnostic: 'Full Diagnostic',
  free: 'Free Session',
  trial: 'Trial Session',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Generate time slots (9 AM to 8 PM in 30-minute intervals)
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const time = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
      slots.push(time)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export default function ModernSchedulingCalendar({
  initialEvents,
  plan,
  onSessionCreated,
  activeSession,
}: ModernSchedulingCalendarProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [checkingActiveSessions, setCheckingActiveSessions] = useState(true)
  const activeSessionCheckRef = useRef(false)

  // ✅ SECURITY: Check for active sessions on mount - enforce one-session-per-customer policy
  useEffect(() => {
    // Prevent multiple simultaneous checks
    if (activeSessionCheckRef.current) return
    activeSessionCheckRef.current = true

    async function checkActiveSessions() {
      try {
        console.log('[Schedule Calendar] Checking for active sessions...')
        const response = await fetch('/api/customer/active-sessions', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })

        if (!response.ok) {
          console.error('[Schedule Calendar] Failed to check active sessions:', response.status)
          setCheckingActiveSessions(false)
          return
        }

        const data = await response.json()
        console.log('[Schedule Calendar] Active sessions check result:', data)

        if (data.hasActiveSessions && data.sessions.length > 0) {
          console.warn('[Schedule Calendar] SECURITY BREACH: Active session detected, blocking schedule access')
          setHasActiveSession(true)
          // Redirect after a brief moment to show the error message
          setTimeout(() => {
            router.push('/customer/dashboard?message=active_session_exists')
          }, 2000)
        }
      } catch (error) {
        console.error('[Schedule Calendar] Error checking active sessions:', error)
      } finally {
        setCheckingActiveSessions(false)
        activeSessionCheckRef.current = false
      }
    }

    checkActiveSessions()
  }, [router])

  // Convert initial events to session objects
  useEffect(() => {
    if (initialEvents) {
      const formattedSessions: SessionEvent[] = initialEvents.map((event) => ({
        id: event.id,
        start: new Date(event.start),
        end: new Date(event.end),
        status: event.status,
        plan: event.plan,
        type: event.type,
      }))
      setSessions(formattedSessions)
    }
    setLoading(false)
  }, [initialEvents])

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    const firstDayWeekday = firstDay.getDay()

    // Last day of month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Previous month days to fill
    const prevMonthDays = firstDayWeekday
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      hasSession: boolean
    }> = []

    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isToday: false,
        hasSession: false,
      })
    }

    // Current month days
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const dateStr = date.toDateString()
      const hasSession = sessions.some(session =>
        session.start.toDateString() === dateStr
      )

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        hasSession,
      })
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isToday: false,
        hasSession: false,
      })
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null)
    setSelectedTime(null)
  }

  const handleDateSelect = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date < today) return // Can't select past dates

    setSelectedDate(date)
    setSelectedTime(null)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime || !plan) return
    setShowConfirmModal(true)
  }

  const proceedToBooking = async () => {
    if (!selectedDate || !selectedTime || !plan) return

    try {
      setActionLoading(true)

      // Parse time and create full datetime
      const [time, period] = selectedTime.split(' ')
      const [hours, minutes] = time.split(':').map(Number)
      let hour = hours
      if (period === 'PM' && hours !== 12) hour += 12
      if (period === 'AM' && hours === 12) hour = 0

      const scheduledDateTime = new Date(selectedDate)
      scheduledDateTime.setHours(hour, minutes, 0, 0)

      // Redirect to intake with scheduled time
      router.push(`/intake?plan=${plan}&scheduled_time=${scheduledDateTime.toISOString()}`)

      onSessionCreated?.()
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setActionLoading(false)
      setShowConfirmModal(false)
    }
  }

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session =>
      session.start.toDateString() === date.toDateString()
    )
  }

  const calendarDays = getCalendarDays()

  // Show loading state while checking for active sessions
  if (checkingActiveSessions) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
          <p className="text-slate-300 text-sm">Verifying session eligibility...</p>
          <p className="text-slate-500 text-xs mt-1">Checking for active sessions</p>
        </div>
      </div>
    )
  }

  // Show error if active session detected - CRITICAL SECURITY BLOCK
  if (hasActiveSession) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
          <h3 className="text-white font-bold text-lg mb-2">Active Session In Progress</h3>
          <p className="text-red-300 text-center mb-4 max-w-md">
            You already have an active session running.<br />
            Please complete or cancel it before scheduling a new one.
          </p>
          <p className="text-xs text-red-400/70 mb-6">
            Policy: One session per customer at a time
          </p>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Active Session Warning */}
      {activeSession && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-300 mb-1">
                Active Session in Progress
              </p>
              <p className="text-xs text-orange-200">
                You have an active {activeSession.type} session ({activeSession.status}).
                You can schedule future appointments, but ensure they don't overlap with your current session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 bg-slate-900/50">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-3 sm:p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-medium text-slate-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, index) => {
              const isSelected = selectedDate?.toDateString() === day.date.toDateString()
              const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0))
              const isDisabled = !day.isCurrentMonth || isPast

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day.date, day.isCurrentMonth)}
                  disabled={isDisabled}
                  className={`
                    relative aspect-square rounded-xl p-1 sm:p-2 text-sm sm:text-base font-medium
                    transition-all duration-200
                    ${isDisabled
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-200 hover:bg-white/10 cursor-pointer'
                    }
                    ${isSelected
                      ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg scale-105'
                      : ''
                    }
                    ${day.isToday && !isSelected
                      ? 'ring-2 ring-blue-500/50 ring-inset'
                      : ''
                    }
                  `}
                >
                  <span className="block">{day.date.getDate()}</span>
                  {day.hasSession && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500"></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm shadow-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Select Time
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 mb-4">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time

              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`
                    px-3 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg scale-105'
                      : 'bg-slate-900/50 text-slate-300 hover:bg-white/10 border border-white/10'
                    }
                  `}
                >
                  {time}
                </button>
              )
            })}
          </div>

          {/* Book Button */}
          {selectedTime && (
            <button
              onClick={handleConfirmBooking}
              disabled={!plan}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {plan ? 'Continue to Booking' : 'Please Select a Plan'}
            </button>
          )}
        </div>
      )}

      {/* Existing Sessions */}
      {selectedDate && getSessionsForDate(selectedDate).length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-300">
                Existing Sessions on This Date
              </p>
              <div className="mt-2 space-y-1">
                {getSessionsForDate(selectedDate).map(session => (
                  <p key={session.id} className="text-xs text-orange-200">
                    {session.start.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })} - {PLAN_LABELS[session.plan]} ({session.status})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedDate && selectedTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Confirm Booking</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-400">Date</p>
                    <p className="text-sm font-medium text-white">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-400">Time</p>
                    <p className="text-sm font-medium text-white">{selectedTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-400">Plan</p>
                    <p className="text-sm font-medium text-white">
                      {plan ? PLAN_LABELS[plan] : 'No plan selected'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedToBooking}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
