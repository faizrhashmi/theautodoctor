'use client'

/**
 * Mechanic Active Session Context
 * Single source of truth for active session state across all mechanic pages
 * Prevents duplicate API calls and provides real-time updates
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

interface ActiveSession {
  id: string
  type: string
  status: string
  plan: string
  createdAt: string
  startedAt: string | null
  mechanicName: string | null
  customerName: string | null
}

interface ActiveSessionContextValue {
  activeSession: ActiveSession | null
  hasActiveSession: boolean
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | undefined>(undefined)

export function MechanicActiveSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveSession = useCallback(async () => {
    try {
      const response = await fetch('/api/mechanic/active-session', {
        // Add cache control to prevent stale data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.active && data.session) {
        setActiveSession(data.session)
      } else {
        setActiveSession(null)
      }

      setError(null)
    } catch (err: any) {
      console.error('[ActiveSessionContext] Error fetching active session:', err)
      setError(err.message || 'Failed to fetch active session')
      setActiveSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchActiveSession()
  }, [fetchActiveSession])

  // Poll every 5 seconds for quick session detection
  // This is faster than the old 30-second polling and uses a single optimized query
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveSession()
    }, 5000) // 5 seconds - fast enough to catch new sessions quickly

    return () => clearInterval(interval)
  }, [fetchActiveSession])

  const value: ActiveSessionContextValue = {
    activeSession,
    hasActiveSession: !!activeSession,
    loading,
    error,
    refetch: fetchActiveSession,
  }

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  )
}

export function useMechanicActiveSession() {
  const context = useContext(ActiveSessionContext)
  if (context === undefined) {
    throw new Error('useMechanicActiveSession must be used within MechanicActiveSessionProvider')
  }
  return context
}
