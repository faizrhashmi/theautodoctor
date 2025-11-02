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

  /**
   * Favorites Priority Broadcast
   *
   * Enables priority notification to favorite mechanic before broadcasting to all.
   * When enabled: Favorite mechanic gets 10-minute priority window
   * When disabled: Standard broadcast to all mechanics
   *
   * @default false
   * @env ENABLE_FAVORITES_PRIORITY
   */
  ENABLE_FAVORITES_PRIORITY: process.env.ENABLE_FAVORITES_PRIORITY === 'true',

  /**
   * Customer Direct RFQ Creation
   *
   * Enables customer-direct RFQ creation (bypasses mechanic escalation).
   * When enabled: Customers can create RFQs directly, workshops can bid
   * When disabled: Customer RFQ creation UI hidden, APIs return 404
   *
   * Requires: ENABLE_WORKSHOP_RFQ must also be enabled
   *
   * @default false
   * @env ENABLE_CUSTOMER_RFQ
   */
  ENABLE_CUSTOMER_RFQ: process.env.ENABLE_CUSTOMER_RFQ === 'true',
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS
