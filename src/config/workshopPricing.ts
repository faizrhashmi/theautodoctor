/**
 * Workshop Pricing Configuration
 *
 * Centralized commission rate constants for the Workshop layer.
 * All commission rates are percentages (0-100).
 */

export const WORKSHOP_PRICING = {
  /**
   * Default commission rate for new workshops (percentage)
   * This is the workshop's cut from each session.
   */
  DEFAULT_COMMISSION_RATE: 10.0,

  /**
   * Platform commission rate (percentage)
   * Fixed platform fee applied to all transactions.
   */
  PLATFORM_COMMISSION_RATE: 15.0,

  /**
   * Minimum allowed commission rate for workshops (percentage)
   */
  MIN_COMMISSION_RATE: 0.0,

  /**
   * Maximum allowed commission rate for workshops (percentage)
   * Capped to ensure mechanics receive fair compensation.
   * Formula: 100 - PLATFORM_COMMISSION_RATE = 85%
   */
  MAX_COMMISSION_RATE: 85.0,
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
