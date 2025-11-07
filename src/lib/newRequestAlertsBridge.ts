'use client'

import { onNewSessionRequest, type NewRequestPayload, type FeatureFlags } from './newRequestAlerts'

/**
 * Bridge for the existing toast system so the dashboard has a single,
 * stable function to call. Adapts the event payload to the alert system's API.
 */
type SimplifiedPayload = {
  sessionId?: string
  assignmentId?: string
  vehicleLabel?: string | null
  concernSummary?: string | null
  customerName?: string | null
}

/**
 * Trigger the multi-tier mechanic alert system (toast + sound + browser notification)
 * with sensible defaults for feature flags.
 */
export function triggerMechanicNewRequestAlert(payload: SimplifiedPayload) {
  // Guard: only run in browser
  if (typeof window === 'undefined') {
    console.warn('[newRequestAlertsBridge] Called on server, skipping')
    return
  }

  try {
    // Adapt the simplified event payload to the full NewRequestPayload format
    const alertPayload: NewRequestPayload = {
      requestId: payload.assignmentId || payload.sessionId || 'unknown',
      customerName: payload.customerName || undefined,
      vehicle: payload.vehicleLabel || undefined,
      concern: payload.concernSummary || undefined,
    }

    // Feature flags with sensible defaults (all enabled for now)
    // TODO: Fetch from user preferences or feature flags table
    const flags: FeatureFlags = {
      mech_new_request_alerts: true,
      mech_audio_alerts: true,
      mech_browser_notifications: true,
      mech_visual_indicators: true,
    }

    // Call the existing multi-tier alert system
    onNewSessionRequest(alertPayload, flags)

    console.log('[newRequestAlertsBridge] ✅ Alert triggered successfully', alertPayload)
  } catch (err) {
    console.error('[newRequestAlertsBridge] Error triggering alert', err)

    // Harmless fallback for dev/testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('[newRequestAlertsBridge] Fallback: would show browser alert in prod')
    }
  }
}
