'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  Calendar,
  Coffee,
  ArrowLeft,
} from 'lucide-react'

interface DayAvailability {
  id?: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  break_start_time: string | null
  break_end_time: string | null
}

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export default function WorkshopAvailabilityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS.map(day => ({
      day_of_week: day.value,
      is_open: day.value >= 1 && day.value <= 5, // Mon-Fri open by default
      open_time: '09:00',
      close_time: '17:00',
      break_start_time: null,
      break_end_time: null,
    }))
  )

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/workshop/availability')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/workshop/login?redirect=/workshop/settings/availability')
          return
        }
        setError(result.error || 'Failed to load availability')
        return
      }

      if (result.availability && result.availability.length > 0) {
        setAvailability(result.availability)
      }
    } catch (err: any) {
      console.error('[WORKSHOP AVAILABILITY] Error:', err)
      setError('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/workshop/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save availability')
        return
      }

      setSuccess('Availability saved successfully!')
      await fetchAvailability()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('[WORKSHOP AVAILABILITY] Save error:', err)
      setError('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (dayIndex: number, updates: Partial<DayAvailability>) => {
    setAvailability(prev =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, ...updates } : day
      )
    )
  }

  const toggleBreak = (dayIndex: number) => {
    const day = availability[dayIndex]
    if (day.break_start_time) {
      updateDay(dayIndex, { break_start_time: null, break_end_time: null })
    } else {
      updateDay(dayIndex, { break_start_time: '12:00', break_end_time: '13:00' })
    }
  }

  const applyToAllWeekdays = () => {
    const mondaySettings = availability[1] // Monday is index 1
    setAvailability(prev =>
      prev.map((day) => {
        // Apply to Mon-Fri (1-5)
        if (day.day_of_week >= 1 && day.day_of_week <= 5) {
          return {
            ...day,
            is_open: mondaySettings.is_open,
            open_time: mondaySettings.open_time,
            close_time: mondaySettings.close_time,
            break_start_time: mondaySettings.break_start_time,
            break_end_time: mondaySettings.break_end_time,
          }
        }
        return day
      })
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/workshop/settings"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Settings</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Clock className="h-8 w-8 text-purple-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Operating Hours
          </h1>
        </div>
        <p className="text-slate-400">
          Set your workshop's operating hours and availability for in-person appointments
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Quick Apply */}
      <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400 mb-1">
                Quick Setup
              </p>
              <p className="text-xs text-slate-400">
                Configure Monday's hours, then apply to all weekdays
              </p>
            </div>
          </div>
          <button
            onClick={applyToAllWeekdays}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Apply Mon to All Weekdays
          </button>
        </div>
      </div>

      {/* Days Schedule */}
      <div className="space-y-4 mb-8">
        {availability.map((day, index) => {
          const dayInfo = DAYS.find(d => d.value === day.day_of_week)!

          return (
            <div
              key={day.day_of_week}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 font-semibold text-white">
                    {dayInfo.label}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.is_open}
                      onChange={(e) => updateDay(index, { is_open: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span className="ms-3 text-sm font-medium text-slate-300">
                      {day.is_open ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </div>

                {day.is_open && (
                  <button
                    onClick={() => toggleBreak(index)}
                    className="flex items-center gap-2 px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                  >
                    <Coffee className="h-3 w-3" />
                    {day.break_start_time ? 'Remove Break' : 'Add Break'}
                  </button>
                )}
              </div>

              {/* Hours Configuration */}
              {day.is_open && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Operating Hours */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Operating Hours
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.open_time}
                        onChange={(e) => updateDay(index, { open_time: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="time"
                        value={day.close_time}
                        onChange={(e) => updateDay(index, { close_time: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Break Time */}
                  {day.break_start_time && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Break Time
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day.break_start_time}
                          onChange={(e) => updateDay(index, { break_start_time: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={day.break_end_time || ''}
                          onChange={(e) => updateDay(index, { break_end_time: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">About Operating Hours</p>
            <ul className="space-y-1 text-slate-400">
              <li>• Customers will only be able to request appointments during your operating hours</li>
              <li>• Break times are blocked for lunch/rest periods</li>
              <li>• You can manually accept appointments outside these hours if needed</li>
              <li>• Changes take effect immediately</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Operating Hours'}
        </button>
      </div>
    </div>
  )
}
