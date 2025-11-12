'use client'

/**
 * UpcomingAppointments - Display upcoming scheduled sessions for customers
 *
 * Features:
 * - Shows next scheduled appointments
 * - Countdown to session start
 * - Waiver signing status and link
 * - Quick actions (sign waiver, cancel, reschedule)
 */

import { useState, useEffect } from 'react'
import { Calendar, Clock, Video, Wrench, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ScheduledAppointment {
  id: string
  mechanic_name: string
  mechanic_workshop: string | null
  scheduled_for: string
  type: string
  waiver_signed_at: string | null
  status: string
}

export default function UpcomingAppointments() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<ScheduledAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Fetch appointments
  useEffect(() => {
    fetchAppointments()
    const interval = setInterval(fetchAppointments, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/customer/scheduled-appointments')
      const data = await response.json()
      if (data.success) {
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('[UpcomingAppointments] Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeUntilAppointment = (scheduledFor: string) => {
    const appointmentTime = new Date(scheduledFor)
    const diff = appointmentTime.getTime() - currentTime.getTime()

    if (diff < 0) {
      return { text: 'Time passed', isUrgent: true, isPast: true }
    }

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return { text: `${days}d ${hours % 24}h`, isUrgent: false, isPast: false }
    } else if (hours > 0) {
      return { text: `${hours}h ${minutes % 60}m`, isUrgent: hours < 1, isPast: false }
    } else if (minutes > 0) {
      return { text: `${minutes} min`, isUrgent: minutes <= 15, isPast: false }
    } else {
      return { text: 'Now!', isUrgent: true, isPast: false }
    }
  }

  const formatAppointmentTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  }

  const needsWaiverSignature = (waiverSignedAt: string | null, scheduledFor: string) => {
    if (waiverSignedAt) return false
    const appointmentTime = new Date(scheduledFor)
    return currentTime < appointmentTime
  }

  const canJoinSession = (scheduledFor: string, waiverSignedAt: string | null) => {
    if (!waiverSignedAt) return false
    const appointmentTime = new Date(scheduledFor)
    const tenMinutesBefore = new Date(appointmentTime.getTime() - 10 * 60000)
    return currentTime >= tenMinutesBefore
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Appointments</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-950/50 rounded-lg h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Appointments</h2>
        </div>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No upcoming appointments</p>
          <Link
            href="/customer/schedule"
            className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition"
          >
            Schedule a Session
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Upcoming Appointments</h2>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
          {appointments.length} scheduled
        </span>
      </div>

      <div className="space-y-4">
        {appointments.map((appointment) => {
          const timeUntil = getTimeUntilAppointment(appointment.scheduled_for)
          const formatted = formatAppointmentTime(appointment.scheduled_for)
          const needsWaiver = needsWaiverSignature(appointment.waiver_signed_at, appointment.scheduled_for)
          const canJoin = canJoinSession(appointment.scheduled_for, appointment.waiver_signed_at)
          const AppointmentIcon = appointment.type === 'video' ? Video : Wrench

          return (
            <div
              key={appointment.id}
              className={`
                bg-slate-950/50 border rounded-lg p-4 transition-all
                ${needsWaiver && timeUntil.isUrgent
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/10'
                  : 'border-slate-800'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <AppointmentIcon className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {appointment.type === 'video' ? 'Online Session' : 'Workshop Visit'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      with {appointment.mechanic_name}
                      {appointment.mechanic_workshop && (
                        <span className="text-slate-500"> • {appointment.mechanic_workshop}</span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`
                    text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0
                    ${timeUntil.isUrgent
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-slate-800 text-slate-400'
                    }
                  `}
                >
                  {timeUntil.isPast ? 'Passed' : `in ${timeUntil.text}`}
                </span>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-3 pl-13">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatted.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatted.time}
                </span>
              </div>

              {/* Waiver Status */}
              <div className="pl-13 mb-3">
                {appointment.waiver_signed_at ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>Waiver signed - Ready to join</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Waiver signature required</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pl-13">
                {needsWaiver && (
                  <Link
                    href={`/customer/sessions/${appointment.id}/waiver`}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition
                      ${timeUntil.isUrgent
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300'
                      }
                    `}
                  >
                    Sign Waiver Now
                  </Link>
                )}

                {canJoin && (
                  <button
                    onClick={() => router.push(`/customer/sessions/${appointment.id}`)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg transition"
                  >
                    Join Session
                  </button>
                )}

                <Link
                  href={`/customer/appointments/${appointment.id}`}
                  className="text-sm text-slate-400 hover:text-white transition"
                >
                  View Details
                </Link>
              </div>

              {/* Urgent Waiver Warning */}
              {needsWaiver && timeUntil.isUrgent && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-300 mb-1">Action Required</p>
                      <p className="text-xs text-orange-200/80">
                        You must sign the session waiver before joining. If the waiver is not signed within 10 minutes
                        of the scheduled time, this appointment will be automatically cancelled per our no-show policy.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Schedule New Button */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <Link
          href="/customer/schedule"
          className="block text-center py-2 text-sm text-slate-400 hover:text-orange-400 transition"
        >
          + Schedule Another Appointment
        </Link>
      </div>
    </div>
  )
}
