/**
 * useFeatureFlags Hook
 *
 * Fetches and caches feature flags from database
 * Provides real-time access to admin-controlled toggles
 */

import { useState, useEffect } from 'react'

interface FeatureFlag {
  flag_key: string
  flag_name: string
  description: string | null
  enabled_for_roles: string[]
  metadata: any
}

interface FeatureFlagsState {
  // Mechanic Alert System Flags
  mech_new_request_alerts: boolean
  mech_audio_alerts: boolean
  mech_browser_notifications: boolean
  mech_visual_indicators: boolean

  // Other existing flags
  rfq_system: boolean
  brand_specialists: boolean
  subscriptions: boolean
  referral_program: boolean
  credit_gifting: boolean
  enhanced_analytics: boolean
}

// Default values (fallback if API fails)
const DEFAULT_FLAGS: FeatureFlagsState = {
  mech_new_request_alerts: true,
  mech_audio_alerts: true,
  mech_browser_notifications: true,
  mech_visual_indicators: true,
  rfq_system: false,
  brand_specialists: true,
  subscriptions: false,
  referral_program: false,
  credit_gifting: false,
  enhanced_analytics: false,
}

// In-memory cache with 30-second TTL
let cachedFlags: FeatureFlagsState | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 30000 // 30 seconds

/**
 * Fetch feature flags from API with caching
 */
async function fetchFlags(): Promise<FeatureFlagsState> {
  const now = Date.now()

  // Return cached flags if still fresh
  if (cachedFlags && now - cacheTimestamp < CACHE_TTL) {
    return cachedFlags
  }

  try {
    const response = await fetch('/api/feature-flags')
    if (!response.ok) {
      console.warn('[useFeatureFlags] API error, using defaults')
      return DEFAULT_FLAGS
    }

    const data = await response.json()
    const flags: FeatureFlag[] = data.flags || []

    // Convert array to object with boolean values
    const flagsState: FeatureFlagsState = { ...DEFAULT_FLAGS }

    // First, set all to false (only enabled flags come from API)
    Object.keys(flagsState).forEach(key => {
      flagsState[key as keyof FeatureFlagsState] = false
    })

    // Then enable the ones that exist in the response
    flags.forEach((flag) => {
      const key = flag.flag_key as keyof FeatureFlagsState
      if (key in flagsState) {
        flagsState[key] = true
      }
    })

    // Update cache
    cachedFlags = flagsState
    cacheTimestamp = now

    return flagsState
  } catch (error) {
    console.error('[useFeatureFlags] Error fetching flags:', error)
    return DEFAULT_FLAGS
  }
}

/**
 * React Hook: Access feature flags with automatic refresh
 *
 * @param refreshInterval - Optional refresh interval in ms (default: 60000 = 1 minute)
 * @returns Feature flags state and loading status
 *
 * @example
 * const { flags, loading } = useFeatureFlags()
 * if (flags.mech_new_request_alerts) {
 *   // Show alerts
 * }
 */
export function useFeatureFlags(refreshInterval: number = 60000) {
  const [flags, setFlags] = useState<FeatureFlagsState>(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadFlags() {
      const freshFlags = await fetchFlags()
      if (mounted) {
        setFlags(freshFlags)
        setLoading(false)
      }
    }

    // Initial load
    loadFlags()

    // Set up refresh interval
    const interval = setInterval(loadFlags, refreshInterval)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [refreshInterval])

  return { flags, loading }
}

/**
 * Invalidate the cache (force refresh on next fetch)
 */
export function invalidateFeatureFlagsCache() {
  cachedFlags = null
  cacheTimestamp = 0
}
