'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, Plus, Save, Trash2, RefreshCw, Calendar,
  CheckCircle, XCircle, AlertTriangle, Eye, EyeOff
} from 'lucide-react'

type AvailabilityBlock = {
  id: string
  mechanic_id?: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

type TimeOff = {
  id: string
  mechanic_id?: string
  start_date: string
  end_date: string
  reason: string | null
  created_at?: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function MechanicAvailabilityPage() {
  const router = useRouter()
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [timeOff, setTimeOff] = useState<TimeOff[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Time off form
  const [showTimeOffForm, setShowTimeOffForm] = useState(false)
  const [timeOffStartDate, setTimeOffStartDate] = useState('')
  const [timeOffEndDate, setTimeOffEndDate] = useState('')
  const [timeOffReason, setTimeOffReason] = useState('')
  const [savingTimeOff, setSavingTimeOff] = useState(false)

  // ✅ Auth guard - Check mechanic authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth check
    fetchAvailability()
    fetchTimeOff()
  }, [isAuthenticated])

  async function fetchAvailability() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/mechanic/availability')

      if (response.status === 401) {
        router.push('/mechanic/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load availability')
      }

      const data = await response.json()
      setAvailability(data.availability || [])
    } catch (err) {
      console.error('Error loading availability:', err)
      setError('Failed to load availability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTimeOff() {
    try {
      const response = await fetch('/api/mechanic/time-off')

      if (!response.ok) {
        return // Non-critical, just skip
      }

      const data = await response.json()
      setTimeOff(data.timeOff || [])
    } catch (err) {
      console.error('Error loading time off:', err)
      // Non-critical, continue
    }
  }

  async function saveAvailability() {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/mechanic/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save availability')
      }

      setSuccessMessage('Availability saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error saving availability:', err)
      setError(err.message || 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  async function saveTimeOff() {
    if (!timeOffStartDate || !timeOffEndDate) {
      setError('Please select start and end dates')
      return
    }

    try {
      setSavingTimeOff(true)
      setError(null)

      const response = await fetch('/api/mechanic/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: timeOffStartDate,
          end_date: timeOffEndDate,
          reason: timeOffReason || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save time off')
      }

      // Reset form and refresh
      setShowTimeOffForm(false)
      setTimeOffStartDate('')
      setTimeOffEndDate('')
      setTimeOffReason('')
      await fetchTimeOff()
      setSuccessMessage('Time off added successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error saving time off:', err)
      setError(err.message || 'Failed to save time off')
    } finally {
      setSavingTimeOff(false)
    }
  }

  async function deleteTimeOff(id: string) {
    if (!confirm('Are you sure you want to delete this time off?')) return

    try {
      const response = await fetch(`/api/mechanic/time-off/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete time off')
      }

      await fetchTimeOff()
      setSuccessMessage('Time off deleted successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error deleting time off:', err)
      setError('Failed to delete time off')
    }
  }

  function toggleBlock(blockId: string) {
    setAvailability(prev =>
      prev.map(block =>
        block.id === blockId ? { ...block, is_active: !block.is_active } : block
      )
    )
  }

  function updateBlock(blockId: string, key: keyof AvailabilityBlock, value: any) {
    setAvailability(prev =>
      prev.map(block =>
        block.id === blockId
          ? { ...block, [key]: key === 'weekday' ? Number(value) : value }
          : block
      )
    )
  }

  function deleteBlock(blockId: string) {
    setAvailability(prev => prev.filter(block => block.id !== blockId))
  }

  function addBlock() {
    setAvailability(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        weekday: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      },
    ])
  }

  // Group by weekday for better visualization
  const groupedByDay = WEEKDAYS.map((day, index) => ({
    day,
    index,
    blocks: availability.filter(b => b.weekday === index),
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Availability Management</h1>
            <p className="mt-1 text-sm text-slate-400">Control when customers can book sessions with you</p>
          </div>
          <button
            onClick={() => router.push('/mechanic/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-300 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-900/20 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <p className="text-green-300">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Weekly Overview */}
        <div className="mb-6 rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4">Weekly Overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WEEKDAYS.map((day, index) => {
              const dayBlocks = availability.filter(b => b.weekday === index && b.is_active)
              return (
                <div key={day} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3">
                  <h3 className="font-semibold text-white text-sm">{day}</h3>
                  {dayBlocks.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">No availability</p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {dayBlocks.map(block => (
                        <div key={block.id} className="text-xs text-green-400">
                          {block.start_time} - {block.end_time}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Availability Blocks */}
        <div className="mb-6 rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Availability Blocks</h2>
              <p className="mt-1 text-sm text-slate-400">Define when you're available for sessions</p>
            </div>
            <button
              onClick={addBlock}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Block
            </button>
          </div>

          {availability.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">No availability blocks configured</p>
              <p className="mt-2 text-sm text-slate-500">Add your first block to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availability.map(block => (
                <div
                  key={block.id}
                  className={`rounded-xl border p-4 transition ${
                    block.is_active
                      ? 'border-green-500/30 bg-green-900/10'
                      : 'border-slate-700/50 bg-slate-900/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Day</label>
                        <select
                          value={block.weekday}
                          onChange={e => updateBlock(block.id, 'weekday', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          {WEEKDAYS.map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Time</label>
                        <input
                          type="time"
                          value={block.start_time}
                          onChange={e => updateBlock(block.id, 'start_time', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">End Time</label>
                        <input
                          type="time"
                          value={block.end_time}
                          onChange={e => updateBlock(block.id, 'end_time', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBlock(block.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          block.is_active
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {block.is_active ? (
                          <>
                            <Eye className="h-4 w-4" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Inactive
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteBlock(block.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {availability.filter(b => b.is_active).length} active block{availability.filter(b => b.is_active).length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={saveAvailability}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Availability
                </>
              )}
            </button>
          </div>
        </div>

        {/* Time Off Management */}
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Time Off / Vacation</h2>
              <p className="mt-1 text-sm text-slate-400">Block out dates when you're unavailable</p>
            </div>
            <button
              onClick={() => setShowTimeOffForm(!showTimeOffForm)}
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Add Time Off
            </button>
          </div>

          {/* Time Off Form */}
          {showTimeOffForm && (
            <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-900/10 p-4">
              <h3 className="font-semibold text-white mb-3">Schedule Time Off</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={timeOffStartDate}
                    onChange={e => setTimeOffStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={timeOffEndDate}
                    onChange={e => setTimeOffEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Vacation, Personal time..."
                  value={timeOffReason}
                  onChange={e => setTimeOffReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveTimeOff}
                  disabled={savingTimeOff}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingTimeOff ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowTimeOffForm(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Time Off List */}
          {timeOff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
              No time off scheduled
            </div>
          ) : (
            <div className="space-y-3">
              {timeOff.map(to => (
                <div key={to.id} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span className="font-semibold text-white">
                          {new Date(to.start_date).toLocaleDateString()} - {new Date(to.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {to.reason && (
                        <p className="mt-1 text-sm text-slate-400">{to.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTimeOff(to.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-1.5 text-sm font-semibold text-red-300 transition hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
