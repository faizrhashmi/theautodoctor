'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface SessionTimerProps {
  /** ISO string for when the session is scheduled to end */
  endsAt: string
  /** Optional ISO string representing when the session started */
  startsAt?: string
  onExpire?: () => void
}

function formatTime(totalSeconds: number) {
  const minutes = Math.max(Math.floor(totalSeconds / 60), 0)
  const seconds = Math.max(totalSeconds % 60, 0)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function SessionTimer({ endsAt, startsAt, onExpire }: SessionTimerProps) {
  const endTime = useMemo(() => new Date(endsAt).getTime(), [endsAt])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (now >= endTime && onExpire) {
      onExpire()
    }
  }, [endTime, now, onExpire])

  const remainingSeconds = Math.max(Math.floor((endTime - now) / 1000), 0)
  const totalSeconds = useMemo(() => {
    if (!startsAt) return 0
    const startMs = new Date(startsAt).getTime()
    return Math.max(Math.floor((endTime - startMs) / 1000), 1)
  }, [endTime, startsAt])

  const progress = totalSeconds > 0 ? Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds) : 0
  const warningLevel = remainingSeconds <= 60 ? 'danger' : remainingSeconds <= 5 * 60 ? 'warning' : 'safe'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className={`rounded-full p-2 ${warningLevel === 'danger' ? 'bg-red-100 text-red-600' : warningLevel === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-orange-600'}`}>
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Timer</p>
          <p className="text-lg font-bold text-slate-900">{formatTime(remainingSeconds)}</p>
        </div>
        {warningLevel !== 'safe' && (
          <div className="ml-auto flex items-center gap-2 text-sm font-medium text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            {warningLevel === 'warning' ? 'Wrap-up soon' : 'Session ending now'}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${warningLevel === 'danger' ? 'bg-red-500' : warningLevel === 'warning' ? 'bg-amber-500' : 'bg-orange-500'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-between text-xs text-slate-500">
          <span>Started {startsAt ? new Date(startsAt).toLocaleTimeString() : 'n/a'}</span>
          <span>Ends {new Date(endsAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}
