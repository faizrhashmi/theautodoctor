/**
 * Server-Side Feature Flag Utilities
 *
 * Use these utilities in API routes and server components
 * to check feature flag status and enforce feature gating.
 *
 * @module lib/flags
 */

import { FEATURE_FLAGS, type FeatureFlagKey } from '@/config/featureFlags'

/**
 * Server-side feature flag check
 *
 * Use in API routes and server components
 *
 * @param flag - The feature flag key to check
 * @returns true if the feature is enabled, false otherwise
 *
 * @example
 * ```ts
 * if (isFeatureEnabled('ENABLE_WORKSHOP_RFQ')) {
 *   // Feature is enabled
 * }
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] === true
}

/**
 * RFQ-specific helper
 *
 * Convenience function for checking if RFQ marketplace is enabled
 *
 * @returns true if RFQ marketplace is enabled
 *
 * @example
 * ```ts
 * if (isRfqEnabled()) {
 *   // Show RFQ UI
 * }
 * ```
 */
export function isRfqEnabled(): boolean {
  return isFeatureEnabled('ENABLE_WORKSHOP_RFQ')
}

/**
 * Guard for API routes
 *
 * Throws an error if the feature is not enabled.
 * Use this at the top of API route handlers to enforce feature gating.
 *
 * @param flag - The feature flag key to require
 * @throws Error if the feature is not enabled
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   requireFeature('ENABLE_WORKSHOP_RFQ')
 *   // ... route logic
 * }
 * ```
 */
export function requireFeature(flag: FeatureFlagKey): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature '${flag}' is not enabled`)
  }
}
