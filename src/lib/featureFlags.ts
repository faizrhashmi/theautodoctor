/**
 * Feature Flags System
 *
 * Reads feature flags from database (admin-controlled) with fallback to environment variables.
 * Provides both server-side and client-side access.
 *
 * This integrates with the existing feature_flags table and admin panel.
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase'

/**
 * Feature flag keys (for certification expansion)
 */
export const FeatureFlags = {
  // Certification expansion
  MULTI_CERT_COPY: 'enable_multi_cert_copy',
  MULTI_CERT_BADGES: 'enable_multi_cert_badges',
  MULTI_CERT_FORMS: 'enable_multi_cert_forms',

  // Existing flags (for reference)
  WORKSHOPS: 'workshops',
  RFQ_SYSTEM: 'rfq_system',
  SUBSCRIPTIONS: 'subscriptions',
  BRAND_SPECIALISTS: 'brand_specialists',
} as const

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags]

/**
 * Feature flag data structure (matches existing table schema)
 */
export interface FeatureFlag {
  id: string
  flag_key: string
  flag_name: string
  description: string | null
  is_enabled: boolean
  enabled_for_roles: string[]
  rollout_percentage: number
  metadata: any
  created_at: string
  updated_at: string
}

/**
 * Get feature flag value (server-side)
 *
 * Priority:
 * 1. Database value (if exists)
 * 2. Environment variable (fallback)
 * 3. Default false
 */
export async function getFeatureFlag(flagKey: FeatureFlagKey): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Try to get from database
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled, rollout_percentage')
      .eq('flag_key', flagKey)
      .maybeSingle()

    if (!error && data) {
      // If flag is disabled, return false
      if (!data.is_enabled) {
        return false
      }

      // If flag is enabled, check rollout percentage
      // For now, simple on/off. Could add gradual rollout logic here.
      return data.rollout_percentage >= 100
    }
  } catch (err) {
    console.error(`Error fetching feature flag ${flagKey}:`, err)
  }

  // Fallback to environment variable
  return getEnvFlag(flagKey)
}

/**
 * Get feature flag from environment variable
 */
function getEnvFlag(flagKey: FeatureFlagKey): boolean {
  const envMap: Record<string, string> = {
    [FeatureFlags.MULTI_CERT_COPY]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_COPY || 'false',
    [FeatureFlags.MULTI_CERT_BADGES]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_BADGES || 'false',
    [FeatureFlags.MULTI_CERT_FORMS]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_FORMS || 'false',
  }

  return envMap[flagKey] === 'true'
}

/**
 * Get all feature flags (server-side)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_key', { ascending: true })

    if (error) {
      console.error('Error fetching feature flags:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getAllFeatureFlags:', err)
    return []
  }
}

/**
 * Get feature flag value (client-side)
 *
 * Note: This makes a real-time query to Supabase
 * Consider using React Query or SWR for caching
 */
export async function getFeatureFlagClient(flagKey: FeatureFlagKey): Promise<boolean> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled, rollout_percentage')
      .eq('flag_key', flagKey)
      .maybeSingle()

    if (!error && data) {
      if (!data.is_enabled) {
        return false
      }
      return data.rollout_percentage >= 100
    }
  } catch (err) {
    console.error(`Error fetching feature flag ${flagKey}:`, err)
  }

  // Fallback to environment variable
  return getEnvFlagClient(flagKey)
}

/**
 * Get feature flag from environment variable (client-side)
 */
function getEnvFlagClient(flagKey: FeatureFlagKey): boolean {
  const envMap: Record<string, string> = {
    [FeatureFlags.MULTI_CERT_COPY]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_COPY || 'false',
    [FeatureFlags.MULTI_CERT_BADGES]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_BADGES || 'false',
    [FeatureFlags.MULTI_CERT_FORMS]: process.env.NEXT_PUBLIC_ENABLE_MULTI_CERT_FORMS || 'false',
  }

  return envMap[flagKey] === 'true'
}

/**
 * Update feature flag (admin only)
 *
 * NOTE: This is typically done via the admin UI (/admin/feature-flags)
 * using the existing API routes (/api/admin/feature-flags/[id])
 */
export async function updateFeatureFlag(
  flagKey: FeatureFlagKey,
  isEnabled: boolean,
  rolloutPercentage?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const updateData: any = {
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    }

    if (rolloutPercentage !== undefined) {
      updateData.rollout_percentage = rolloutPercentage
    }

    const { error } = await supabase
      .from('feature_flags')
      .update(updateData)
      .eq('flag_key', flagKey)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * React hook for feature flags (client-side)
 *
 * Usage:
 * const isEnabled = useFeatureFlag(FeatureFlags.MULTI_CERT_COPY)
 */
export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  // For now, just use env vars
  // In a real implementation, you'd use React Query or SWR here
  return getEnvFlagClient(flagKey)
}
