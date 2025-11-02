/**
 * Server-Side Feature Flag Utilities
 *
 * Use these utilities in API routes and server components
 * to check feature flag status and enforce feature gating.
 *
 * ✨ NEW: Database-driven feature flags with instant toggling!
 *    - Toggle from /admin/feature-flags UI
 *    - No server restart required
 *    - Environment variables used as fallback only
 *
 * @module lib/flags
 */

import { FEATURE_FLAGS, type FeatureFlagKey } from '@/config/featureFlags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Check feature flag status (database + env fallback)
 *
 * ASYNC version - checks database first, falls back to env var
 *
 * @param flag - The feature flag key to check
 * @returns Promise<boolean> - true if the feature is enabled
 *
 * @example
 * ```ts
 * if (await isFeatureEnabled('ENABLE_WORKSHOP_RFQ')) {
 *   // Feature is enabled
 * }
 * ```
 */
export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  try {
    // Check database first (primary source of truth)
    const { data: dbFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flag)
      .maybeSingle()

    if (error) {
      console.warn(`[flags] Database error for ${flag}, using env fallback:`, error.message)
      return FEATURE_FLAGS[flag] === true
    }

    if (dbFlag) {
      // Database value found - use it (ignores .env)
      return dbFlag.is_enabled === true
    }

    // Flag not in database - fall back to env var
    console.warn(`[flags] ${flag} not found in database, using env fallback`)
    return FEATURE_FLAGS[flag] === true
  } catch (err) {
    // Any unexpected error - fall back to env var
    console.error(`[flags] Unexpected error checking ${flag}:`, err)
    return FEATURE_FLAGS[flag] === true
  }
}

/**
 * SYNC version for backward compatibility
 *
 * Only checks environment variables (old behavior)
 * Use async version for database-driven flags
 *
 * @deprecated Use async isFeatureEnabled() instead
 */
export function isFeatureEnabledSync(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag] === true
}

/**
 * RFQ-specific helper (async)
 *
 * Convenience function for checking if RFQ marketplace is enabled
 *
 * @returns Promise<boolean> - true if RFQ marketplace is enabled
 *
 * @example
 * ```ts
 * if (await isRfqEnabled()) {
 *   // Show RFQ UI
 * }
 * ```
 */
export async function isRfqEnabled(): Promise<boolean> {
  return isFeatureEnabled('ENABLE_WORKSHOP_RFQ')
}

/**
 * Guard for API routes (async)
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
 *   await requireFeature('ENABLE_WORKSHOP_RFQ')
 *   // ... route logic
 * }
 * ```
 */
export async function requireFeature(flag: FeatureFlagKey): Promise<void> {
  const enabled = await isFeatureEnabled(flag)
  if (!enabled) {
    throw new Error(`Feature '${flag}' is not enabled`)
  }
}
