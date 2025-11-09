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
  // Platform feature flags
  rfq_system: boolean
  quote_system: boolean // Diagnostic-based quote system
  brand_specialists: boolean
  subscriptions: boolean
  referral_program: boolean
  credit_gifting: boolean
  enhanced_analytics: boolean
}

// Default values (fallback if API fails)
const DEFAULT_FLAGS: FeatureFlagsState = {
  rfq_system: true, // RFQ Marketplace enabled by default
  quote_system: false, // Quote system disabled until demand is seen
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

/**
 * React Hook: Check if a specific feature flag is enabled
 *
 * @param flagKey - The feature flag key to check
 * @returns Boolean indicating if the feature is enabled
 *
 * @example
 * const isEnabled = useFeatureFlag('ENABLE_CUSTOMER_RFQ')
 * if (isEnabled) {
 *   // Show RFQ creation UI
 * }
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { flags } = useFeatureFlags()

  // Map environment-based feature flag keys to database flag keys
  const flagKeyMap: Record<string, keyof FeatureFlagsState> = {
    'ENABLE_WORKSHOP_RFQ': 'rfq_system',
    'ENABLE_CUSTOMER_RFQ': 'rfq_system', // Customer RFQ uses the same flag as workshop RFQ
    'ENABLE_QUOTE_SYSTEM': 'quote_system', // Diagnostic-based quote system
    'ENABLE_FAVORITES_PRIORITY': 'rfq_system', // This might need its own flag
  }

  const dbFlagKey = flagKeyMap[flagKey]

  if (!dbFlagKey) {
    console.warn(`[useFeatureFlag] Unknown feature flag: ${flagKey}`)
    return false
  }

  return flags[dbFlagKey] || false
}
