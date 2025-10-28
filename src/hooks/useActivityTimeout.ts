'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseActivityTimeoutOptions {
  /**
   * Timeout duration in milliseconds
   * @example 2 * 60 * 60 * 1000 // 2 hours
   */
  timeoutMs: number

  /**
   * Callback function to execute on timeout (e.g., logout)
   */
  onTimeout: () => void | Promise<void>

  /**
   * Array of events that should reset the timeout
   * @default ['mousedown', 'keydown', 'scroll', 'touchstart']
   */
  events?: string[]

  /**
   * Whether to show a warning before timeout
   * @default false
   */
  showWarning?: boolean

  /**
   * Warning time in milliseconds before timeout
   * @default 5 * 60 * 1000 // 5 minutes
   */
  warningMs?: number
}

/**
 * Hook to automatically log out users after a period of inactivity
 *
 * @example
 * ```typescript
 * useActivityTimeout({
 *   timeoutMs: 2 * 60 * 60 * 1000, // 2 hours
 *   onTimeout: async () => {
 *     await fetch('/api/admin/logout', { method: 'POST' })
 *     window.location.href = '/admin/login'
 *   }
 * })
 * ```
 */
export function useActivityTimeout({
  timeoutMs,
  onTimeout,
  events = ['mousedown', 'keydown', 'scroll', 'touchstart'],
  showWarning = false,
  warningMs = 5 * 60 * 1000, // 5 minutes default warning
}: UseActivityTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
    warningShownRef.current = false
  }, [])

  // Show warning (if enabled)
  const showWarningMessage = useCallback(() => {
    if (!showWarning || warningShownRef.current) return

    warningShownRef.current = true

    // Simple browser alert (can be replaced with a toast notification)
    const remainingMinutes = Math.floor(warningMs / 60000)
    alert(
      `Your session will expire in ${remainingMinutes} minute(s) due to inactivity. ` +
      `Move your mouse or press any key to stay logged in.`
    )
  }, [showWarning, warningMs])

  // Reset the timeout
  const resetTimeout = useCallback(() => {
    clearTimers()

    // Set warning timeout (if enabled)
    if (showWarning && warningMs > 0 && warningMs < timeoutMs) {
      const warningTime = timeoutMs - warningMs
      warningTimeoutRef.current = setTimeout(() => {
        showWarningMessage()
      }, warningTime)
    }

    // Set main timeout
    timeoutRef.current = setTimeout(async () => {
      console.log('[ActivityTimeout] Session expired due to inactivity')
      await onTimeout()
    }, timeoutMs)
  }, [timeoutMs, warningMs, showWarning, onTimeout, clearTimers, showWarningMessage])

  // Set up event listeners
  useEffect(() => {
    // Initial timeout setup
    resetTimeout()

    // Add event listeners to reset timeout on user activity
    const handleActivity = () => {
      resetTimeout()
    }

    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      clearTimers()
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimeout, clearTimers, events])

  // Return cleanup function in case component needs manual control
  return { resetTimeout, clearTimers }
}
