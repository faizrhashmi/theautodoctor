/**
 * Mechanic Pricing and Fee Configuration
 *
 * Phase 2: Batch 2 Mechanic Surface Remediation
 * Centralized fee structure for B2C (direct mechanic) model.
 *
 * Business Model Defaults (locked from user approval):
 * - B2C: mechanicShareRate=0.85, platformFeeRate=0.15, referralFeeRate=0.02
 *
 * NOTE: These are FALLBACK values. The platform now uses database-driven fees
 * from platform_fee_settings table. See src/lib/platformFees.ts
 */

export const MECHANIC_FEES = {
  /**
   * B2C Model - Direct Mechanic (no workshop)
   * Mechanic receives 85% of session price
   */
  B2C_MECHANIC_SHARE_RATE: 0.85,

  /**
   * Platform fee rate for all sessions (percentage as decimal)
   * Applied to gross session price before mechanic share
   */
  PLATFORM_FEE_RATE: 0.15,

  /**
   * Referral fee for escalated sessions (percentage as decimal)
   * Virtual mechanic earns 2% when customer approves workshop repair quote
   * UPDATED: 2025-11-08 - Changed from 5% to 2% per business model
   */
  REFERRAL_FEE_RATE: 0.02,

  /**
   * Platform fee rate as percentage (for display)
   */
  PLATFORM_FEE_PERCENT: 15,

  /**
   * Mechanic share rate as percentage (for display)
   */
  MECHANIC_SHARE_PERCENT: 85,

  /**
   * Referral fee as percentage (for display)
   * UPDATED: 2025-11-08 - Changed from 5% to 2% per business model
   */
  REFERRAL_FEE_PERCENT: 2,
} as const

/**
 * Calculate mechanic earnings from session price
 * @param sessionPrice - Gross session price in dollars
 * @returns Net mechanic earnings after platform fee
 */
export function calculateMechanicEarnings(sessionPrice: number): number {
  return sessionPrice * MECHANIC_FEES.B2C_MECHANIC_SHARE_RATE
}

/**
 * Calculate platform fee from session price
 * @param sessionPrice - Gross session price in dollars
 * @returns Platform fee amount
 */
export function calculatePlatformFee(sessionPrice: number): number {
  return sessionPrice * MECHANIC_FEES.PLATFORM_FEE_RATE
}

/**
 * Calculate referral fee from approved repair amount
 * @param repairAmount - Approved repair quote amount
 * @returns Referral fee for mechanic
 */
export function calculateReferralFee(repairAmount: number): number {
  return repairAmount * MECHANIC_FEES.REFERRAL_FEE_RATE
}

/**
 * Earnings breakdown for a session
 */
export interface EarningsBreakdown {
  grossAmount: number
  platformFee: number
  mechanicEarnings: number
  mechanicShareRate: number
}

/**
 * Calculate full earnings breakdown for display
 * @param sessionPrice - Gross session price
 * @returns Breakdown of earnings and fees
 */
export function getEarningsBreakdown(sessionPrice: number): EarningsBreakdown {
  return {
    grossAmount: sessionPrice,
    platformFee: calculatePlatformFee(sessionPrice),
    mechanicEarnings: calculateMechanicEarnings(sessionPrice),
    mechanicShareRate: MECHANIC_FEES.B2C_MECHANIC_SHARE_RATE,
  }
}
