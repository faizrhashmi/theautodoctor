/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for testing and experimental features
 */

export interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  expiresAt?: string | null
  allowedRoles?: ('customer' | 'mechanic' | 'admin')[]
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Camera/Mic bypass for testing (temporary)
  BYPASS_MEDIA_CHECK: {
    key: 'BYPASS_MEDIA_CHECK',
    name: 'Bypass Camera/Microphone Check',
    description: 'Skip camera and microphone permission checks for testing purposes. Use only in development or staging.',
    enabled: false,
    expiresAt: null, // Set expiration date when enabling
    allowedRoles: ['admin'], // Only admins can use this
  },

  // Add more feature flags here as needed
}

/**
 * Check if a feature flag is enabled for the current user
 */
export function isFeatureEnabled(
  flagKey: string,
  userRole?: 'customer' | 'mechanic' | 'admin'
): boolean {
  const flag = FEATURE_FLAGS[flagKey]

  if (!flag) {
    console.warn(`[FeatureFlags] Unknown feature flag: ${flagKey}`)
    return false
  }

  // Check if flag is enabled
  if (!flag.enabled) {
    return false
  }

  // Check expiration
  if (flag.expiresAt) {
    const expirationDate = new Date(flag.expiresAt)
    if (new Date() > expirationDate) {
      console.warn(`[FeatureFlags] Feature flag ${flagKey} has expired`)
      return false
    }
  }

  // Check role restrictions
  if (flag.allowedRoles && flag.allowedRoles.length > 0) {
    if (!userRole) {
      return false
    }
    if (!flag.allowedRoles.includes(userRole)) {
      return false
    }
  }

  return true
}

/**
 * Get all feature flags with their current status
 */
export function getAllFeatureFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS)
}

/**
 * Check if bypass media check is enabled
 * Convenience function for the most common check
 */
export function shouldBypassMediaCheck(userRole?: 'customer' | 'mechanic' | 'admin'): boolean {
  return isFeatureEnabled('BYPASS_MEDIA_CHECK', userRole)
}
