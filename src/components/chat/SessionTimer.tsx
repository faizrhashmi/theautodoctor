'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

interface SessionTimerProps {
  sessionType: 'chat' | 'video' | 'diagnostic'
  startedAt: string | null // ISO timestamp when mechanic joined
  onSessionEnd?: () => void
}

const SESSION_DURATIONS = {
  chat: 15 * 60, // 15 minutes in seconds
  video: 30 * 60, // 30 minutes
  diagnostic: 60 * 60, // 60 minutes
}

const SESSION_LABELS = {
  chat: 'Quick Chat (15 min)',
  video: 'Standard Video (30 min)',
  diagnostic: 'Full Diagnostic (60 min)',
}

export default function SessionTimer({ sessionType, startedAt, onSessionEnd }: SessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isWarning, setIsWarning] = useState(false)

  useEffect(() => {
    if (!startedAt) {
      setTimeRemaining(null)
      return
    }

    const totalDuration = SESSION_DURATIONS[sessionType]

    function updateTimer() {
      const elapsed = Math.floor((Date.now() - new Date(startedAt!).getTime()) / 1000)
      const remaining = totalDuration - elapsed

      if (remaining <= 0) {
        setTimeRemaining(0)
        onSessionEnd?.()
      } else {
        setTimeRemaining(remaining)
        setIsWarning(remaining <= 300) // Warning at 5 minutes
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [startedAt, sessionType, onSessionEnd])

  if (timeRemaining === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        <span>Waiting for mechanic to join...</span>
      </div>
    )
  }

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const progressPercentage = (timeRemaining / SESSION_DURATIONS[sessionType]) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWarning ? (
            <AlertCircle className="w-4 h-4 text-orange-500 animate-pulse" />
          ) : (
            <Clock className="w-4 h-4 text-orange-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {SESSION_LABELS[sessionType]}
          </span>
        </div>
        <span className={`text-lg font-bold tabular-nums ${isWarning ? 'text-orange-600' : 'text-orange-600'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isWarning ? 'bg-orange-500' : 'bg-orange-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {isWarning && (
        <p className="text-xs text-orange-600 font-medium">
          Less than 5 minutes remaining
        </p>
      )}
    </div>
  )
}
