/**
 * Feature Flags
 *
 * Central place to enable/disable features for gradual rollout
 * and instant rollback if needed
 */

export const features = {
  // Mechanic New Request Alerts System
  mechNewRequestAlerts: true,      // master flag for tiers 1–4
  mechBrowserNotifications: true,  // sub-flag for Tier 3
  mechAudioAlerts: true,           // sub-flag for Tier 2
  mechVisualIndicators: true,      // sub-flag for Tier 4
} as const

export type FeatureFlags = typeof features
