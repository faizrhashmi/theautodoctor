/**
 * Client-Side Feature Flag Hook
 *
 * React hooks for checking feature flag status in client components.
 * Fetches flag status from API to prevent env var leakage to client.
 *
 * @module hooks/useFeatureFlags
 */

'use client'

import { useState, useEffect } from 'react'
import type { FeatureFlagKey } from '@/config/featureFlags'

interface FeatureFlagResponse {
  enabled: boolean
}

/**
 * Client-side feature flag hook
 *
 * Fetches flag status from API to prevent env var leakage
 *
 * @param flag - The feature flag key to check
 * @returns true if the feature is enabled, false otherwise (including during loading)
 *
 * @example
 * ```tsx
 * const isRfqEnabled = useFeatureFlag('ENABLE_WORKSHOP_RFQ')
 *
 * if (!isRfqEnabled) return null
 *
 * return <RfqButton />
 * ```
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/feature-flags/${flag}`)
      .then(res => res.json())
      .then((data: FeatureFlagResponse) => {
        setEnabled(data.enabled)
        setLoading(false)
      })
      .catch(() => {
        setEnabled(false)
        setLoading(false)
      })
  }, [flag])

  return enabled
}

/**
 * RFQ-specific hook
 *
 * Convenience hook for checking if RFQ marketplace is enabled
 *
 * @returns true if RFQ marketplace is enabled
 *
 * @example
 * ```tsx
 * const isRfqEnabled = useRfqEnabled()
 *
 * return (
 *   <div>
 *     {isRfqEnabled && <RfqMarketplaceButton />}
 *   </div>
 * )
 * ```
 */
export function useRfqEnabled(): boolean {
  return useFeatureFlag('ENABLE_WORKSHOP_RFQ')
}
