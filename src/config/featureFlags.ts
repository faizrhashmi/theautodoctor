/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollouts
 * and emergency kill-switches.
 *
 * @module config/featureFlags
 */

export const FEATURE_FLAGS = {
  /**
   * RFQ Marketplace
   *
   * Enables multi-workshop competitive bidding system.
   * When disabled: RFQ UI hidden, RFQ APIs return 404
   *
   * @default false
   * @env ENABLE_WORKSHOP_RFQ
   */
  ENABLE_WORKSHOP_RFQ: process.env.ENABLE_WORKSHOP_RFQ === 'true',
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS
