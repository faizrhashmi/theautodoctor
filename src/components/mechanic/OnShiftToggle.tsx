'use client'

import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut, Activity, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OnShiftToggleProps {
  onStatusChange?: (status: 'on_shift' | 'off_shift') => void
}

export default function OnShiftToggle({ onStatusChange }: OnShiftToggleProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/mechanic/clock')
      if (!response.ok) throw new Error('Failed to fetch status')

      const data = await response.json()
      setStatus(data.status)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching clock status:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleClockAction = async (action: 'clock_in' | 'clock_out') => {
    setProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/mechanic/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action.replace('_', ' ')}`)
      }

      setSuccess(data.message)
      setTimeout(() => setSuccess(null), 3000)

      // Refresh status
      await fetchStatus()

      // Notify parent
      if (onStatusChange) {
        onStatusChange(action === 'clock_in' ? 'on_shift' : 'off_shift')
      }
    } catch (err: any) {
      console.error(`Error ${action}:`, err)
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-700"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-700"></div>
            <div className="h-3 w-32 animate-pulse rounded bg-slate-700"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-200">Failed to load shift status</p>
        </div>
      </div>
    )
  }

  const isOnShift = status.currently_on_shift
  const availabilityStatus = status.availability_status

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div
        className={`rounded-xl border p-4 transition ${
          isOnShift
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-slate-600 bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Left: Status Display */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                isOnShift
                  ? 'bg-gradient-to-br from-green-500 to-green-600'
                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
              }`}
            >
              {isOnShift ? (
                <Activity className="h-6 w-6 text-white" />
              ) : (
                <Clock className="h-6 w-6 text-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`font-semibold ${
                    isOnShift ? 'text-green-300' : 'text-slate-300'
                  }`}
                >
                  {isOnShift ? 'On Shift' : 'Off Shift'}
                </h3>
                <StatusBadge status={availabilityStatus} />
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                {isOnShift ? (
                  <>
                    <span>Available for micro-sessions</span>
                    {status.workshop_name && (
                      <>
                        <span>•</span>
                        <span>{status.workshop_name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span>Clock in to accept micro-sessions</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Clock Action Button */}
          <button
            onClick={() => handleClockAction(isOnShift ? 'clock_out' : 'clock_in')}
            disabled={processing}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              isOnShift
                ? 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                : 'border border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
            }`}
          >
            {processing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Processing...
              </>
            ) : isOnShift ? (
              <>
                <LogOut className="h-4 w-4" />
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Clock In
              </>
            )}
          </button>
        </div>

        {/* Micro-Session Usage */}
        {isOnShift && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Micro-Session Minutes Today</span>
              <span className="font-semibold text-white">
                {status.daily_micro_minutes_used} / {status.daily_micro_minutes_cap} min
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                style={{
                  width: `${Math.min((status.daily_micro_minutes_used / status.daily_micro_minutes_cap) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {status.micro_minutes_remaining} minutes remaining
            </div>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3"
          >
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-200">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
          >
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participation Mode Info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Participation Mode</span>
          <span className="font-medium capitalize text-slate-300">
            {status.participation_mode?.replace('_', ' ')}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {status.participation_mode === 'both' &&
            'You can accept both micro-sessions (on-shift) and full sessions (anytime)'}
          {status.participation_mode === 'micro_only' &&
            'You can only accept quick micro-sessions while on-shift'}
          {status.participation_mode === 'full_only' &&
            'You can only accept full diagnostic sessions (no micro-sessions)'}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    on_shift: { label: 'Active', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    off_shift: { label: 'Available', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    offline: { label: 'Offline', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' },
  }

  const config = statusConfig[status] || statusConfig.offline

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  )
}
