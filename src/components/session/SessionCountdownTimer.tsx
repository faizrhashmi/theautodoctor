'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionCountdownTimerProps {
  sessionId: string
  timeCapSeconds: number
  sessionType: 'micro' | 'standard' | 'extended'
  onTimeExpired: () => void
  onExtensionRequest?: () => void
  allowExtension?: boolean
  isDispatcher?: boolean
}

export default function SessionCountdownTimer({
  sessionId,
  timeCapSeconds,
  sessionType,
  onTimeExpired,
  onExtensionRequest,
  allowExtension = false,
  isDispatcher = false,
}: SessionCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeCapSeconds)
  const [isPaused, setIsPaused] = useState(false)
  const [hasExpired, setHasExpired] = useState(false)
  const [extensionRequested, setExtensionRequested] = useState(false)

  // Calculate time display
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const percentage = (timeRemaining / timeCapSeconds) * 100

  // Determine urgency level
  const getUrgencyLevel = () => {
    if (percentage > 50) return 'safe'
    if (percentage > 25) return 'warning'
    if (percentage > 10) return 'danger'
    return 'critical'
  }

  const urgencyLevel = getUrgencyLevel()

  // Color schemes based on urgency
  const colorSchemes = {
    safe: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      text: 'text-green-300',
      ring: 'stroke-green-500',
    },
    warning: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-300',
      ring: 'stroke-yellow-500',
    },
    danger: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      ring: 'stroke-orange-500',
    },
    critical: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-300',
      ring: 'stroke-red-500',
    },
  }

  const colors = colorSchemes[urgencyLevel]

  // Countdown logic
  useEffect(() => {
    if (isPaused || hasExpired) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setHasExpired(true)
          onTimeExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, hasExpired, onTimeExpired])

  const handleExtensionRequest = () => {
    if (!extensionRequested && onExtensionRequest) {
      setExtensionRequested(true)
      onExtensionRequest()
    }
  }

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev)
  }

  // Micro-session specific display
  const isMicroSession = sessionType === 'micro'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Timer Display */}
        <div className="flex items-center gap-4">
          {/* Circular Progress */}
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90 transform">
              {/* Background circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-700"
              />
              {/* Progress circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className={colors.ring}
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - percentage / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className={`h-6 w-6 ${colors.text}`} />
            </div>
          </div>

          {/* Time Display */}
          <div>
            <div className={`text-3xl font-bold ${colors.text} tabular-nums`}>
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>
                {isMicroSession ? 'Micro-Session' : 'Session'} Time Remaining
              </span>
              {isPaused && (
                <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300">
                  PAUSED
                </span>
              )}
              {hasExpired && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                  TIME EXPIRED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Extension Button (for micro-sessions) */}
          {isMicroSession && allowExtension && !hasExpired && !extensionRequested && (
            <button
              onClick={handleExtensionRequest}
              className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
              title="Request 2-minute extension"
            >
              <Plus className="h-4 w-4" />
              Extend 2 Min
            </button>
          )}

          {extensionRequested && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300">
              Extension Requested
            </div>
          )}

          {/* Pause/Resume (dispatcher only) */}
          {isDispatcher && !hasExpired && (
            <button
              onClick={handlePauseToggle}
              className="rounded-lg border border-slate-600 bg-slate-700/40 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-600/40"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </div>

      {/* Warning Messages */}
      <AnimatePresence>
        {urgencyLevel === 'critical' && !hasExpired && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-200">
              {isMicroSession
                ? 'Micro-session ending soon! Wrap up your advice.'
                : 'Session ending soon! Please conclude.'}
            </p>
          </motion.div>
        )}

        {hasExpired && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm font-semibold text-red-200">
              Time limit reached. Session will auto-end.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Type Badge */}
      {isMicroSession && (
        <div className="mt-3 text-xs text-slate-500">
          💡 Micro-sessions are time-boxed to keep shop operations running smoothly
        </div>
      )}
    </motion.div>
  )
}
