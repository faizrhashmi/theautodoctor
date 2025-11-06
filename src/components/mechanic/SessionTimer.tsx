'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Pause } from 'lucide-react'

interface SessionTimerProps {
  startedAt: string
}

export default function SessionTimer({ startedAt }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const start = new Date(startedAt).getTime()

    const updateTimer = () => {
      if (!isPaused) {
        const now = Date.now()
        const diff = Math.floor((now - start) / 1000) // seconds
        setElapsed(diff)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [startedAt, isPaused])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
          <Clock className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Session Duration</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {formatTime(elapsed)}
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsPaused(!isPaused)}
        className="rounded-lg border border-slate-600 bg-slate-700/50 p-2 text-slate-300 hover:bg-slate-600/50 hover:text-white transition"
        title={isPaused ? 'Resume timer display' : 'Pause timer display'}
      >
        {isPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
