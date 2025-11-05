/**
 * Device Fingerprinting Utility
 * Generates a unique identifier for the current browser/device
 * Used for single-device session enforcement
 */

export interface DeviceInfo {
  fingerprint: string
  userAgent: string
  platform: string
  screenResolution: string
  timezone: string
  language: string
}

/**
 * Generate a unique device fingerprint based on browser characteristics
 * This is NOT cryptographically secure - it's for session management only
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering - return placeholder
    return 'ssr-placeholder'
  }

  try {
    // Collect browser characteristics
    const userAgent = navigator.userAgent || 'unknown'
    const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
    const language = navigator.language || 'unknown'
    const platform = navigator.platform || 'unknown'
    const hardwareConcurrency = navigator.hardwareConcurrency || 0

    // Additional characteristics
    const touchSupport = 'ontouchstart' in window ? '1' : '0'
    const cookieEnabled = navigator.cookieEnabled ? '1' : '0'
    const doNotTrack = navigator.doNotTrack || 'unknown'

    // Combine into fingerprint string
    const fingerprintData = [
      userAgent,
      screenResolution,
      timezone,
      language,
      platform,
      hardwareConcurrency,
      touchSupport,
      cookieEnabled,
      doNotTrack
    ].join('|')

    // Simple hash function (not cryptographic - just for fingerprinting)
    let hash = 0
    for (let i = 0; i < fingerprintData.length; i++) {
      const char = fingerprintData.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Convert to base36 string and add timestamp component
    const hashStr = Math.abs(hash).toString(36)
    const timeComponent = Date.now().toString(36).slice(-4)

    return `${hashStr}-${timeComponent}`
  } catch (error) {
    console.error('[DeviceFingerprint] Error generating fingerprint:', error)
    // Fallback to random string if fingerprinting fails
    return `fallback-${Math.random().toString(36).substring(2, 15)}`
  }
}

/**
 * Get detailed device information for debugging/logging
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      fingerprint: 'ssr-placeholder',
      userAgent: 'SSR',
      platform: 'SSR',
      screenResolution: '0x0',
      timezone: 'UTC',
      language: 'en'
    }
  }

  return {
    fingerprint: generateDeviceFingerprint(),
    userAgent: navigator.userAgent || 'unknown',
    platform: navigator.platform || 'unknown',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    language: navigator.language || 'unknown'
  }
}

/**
 * Store device fingerprint in sessionStorage for consistency during page reloads
 * This ensures the same fingerprint is used throughout a browser session
 */
export function getOrCreateSessionFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'ssr-placeholder'
  }

  const STORAGE_KEY = 'device_fingerprint_session'

  try {
    // Try to get existing fingerprint from sessionStorage
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      return stored
    }

    // Generate new fingerprint and store it
    const newFingerprint = generateDeviceFingerprint()
    sessionStorage.setItem(STORAGE_KEY, newFingerprint)

    return newFingerprint
  } catch (error) {
    // sessionStorage might be disabled - just generate fresh each time
    console.warn('[DeviceFingerprint] sessionStorage unavailable:', error)
    return generateDeviceFingerprint()
  }
}
