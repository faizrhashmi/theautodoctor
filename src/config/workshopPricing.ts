/**
 * Workshop Pricing Configuration
 *
 * ⚠️ DEPRECATED: This file contains outdated business model concepts.
 *
 * CORRECT BUSINESS MODEL:
 * - Platform: 30% (fixed)
 * - Workshop: 70% (fixed)
 * - Workshop manages mechanic payments internally (platform not involved)
 *
 * Use src/lib/platformFees.ts for all pricing calculations.
 *
 * UPDATED: 2025-11-11 - Values changed to match database (70/30 split)
 */

export const WORKSHOP_PRICING = {
  /**
   * @deprecated Workshop commission rate doesn't exist in current business model
   * Workshops receive 70% of session payment (fixed split)
   */
  DEFAULT_COMMISSION_RATE: 70.0,

  /**
   * Platform fee rate (percentage)
   * UPDATED: 2025-11-11 - Changed from 15% to 30%
   */
  PLATFORM_COMMISSION_RATE: 30.0,

  /**
   * @deprecated Not used in current business model
   */
  MIN_COMMISSION_RATE: 70.0,

  /**
   * @deprecated Not used in current business model
   */
  MAX_COMMISSION_RATE: 70.0,
} as const

/**
 * Calculate mechanic's share after platform and workshop commissions
 * @param workshopCommissionRate - Workshop's commission rate (0-85)
 * @returns Mechanic's percentage share
 */
export function calculateMechanicShare(workshopCommissionRate: number): number {
  const totalCommissions = WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE + workshopCommissionRate
  return 100 - totalCommissions
}

/**
 * Validate commission rate is within allowed bounds
 * @param rate - Commission rate to validate
 * @returns True if valid, false otherwise
 */
export function isValidCommissionRate(rate: number): boolean {
  return (
    rate >= WORKSHOP_PRICING.MIN_COMMISSION_RATE &&
    rate <= WORKSHOP_PRICING.MAX_COMMISSION_RATE &&
    !isNaN(rate)
  )
}

/**
 * Type guard for commission rate validation
 * Ensures commission rate is a valid number within bounds
 */
export type ValidCommissionRate = number & { __brand: 'ValidCommissionRate' }

/**
 * Safely parse and validate commission rate
 * @param value - Value to parse as commission rate
 * @returns Valid commission rate or default
 */
export function parseCommissionRate(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value))

  if (isValidCommissionRate(parsed)) {
    return parsed
  }

  return WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE
}
