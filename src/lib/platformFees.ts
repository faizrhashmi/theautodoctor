/**
 * Platform Fee Management
 *
 * Provides centralized access to platform fee settings with caching and fallbacks.
 * Replaces hardcoded values in config files with database-driven settings.
 *
 * Usage:
 * ```typescript
 * const fees = await getPlatformFees()
 * const mechanicShare = fees.sessionMechanicPercent // 70
 * const platformFee = fees.sessionPlatformPercent   // 30
 * ```
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ============================================================================
// TYPES
// ============================================================================

export interface PlatformFees {
  /** Mechanic gets this % of session payment (default: 70%) */
  sessionMechanicPercent: number

  /** Platform gets this % of session payment (default: 30%) */
  sessionPlatformPercent: number

  /** Referral fee % for virtual mechanics (default: 2%) */
  referralFeePercent: number

  /** Platform fee % on workshop quotes/repairs (default: 15%) */
  workshopQuotePlatformFee: number

  /** Days to hold payment in escrow before auto-release (default: 7) */
  escrowHoldDays: number

  /** High-value threshold in cents (default: $1000 = 100000 cents) */
  highValueThresholdCents: number

  /** Days to hold high-value payments (default: 14) */
  highValueEscrowHoldDays: number

  /** Whether auto-release is enabled */
  enableAutoRelease: boolean

  /** Whether manual approval required for high-value jobs */
  requireManualApprovalOverThreshold: boolean
}

export interface WorkshopFeeOverride {
  workshopId: string
  customSessionPlatformFee?: number | null
  customQuotePlatformFee?: number | null
  customEscrowHoldDays?: number | null
  agreementType?: string | null
  agreementNotes?: string | null
  isActive: boolean
}

export interface MechanicFeeOverride {
  mechanicId: string
  customReferralFeePercent: number
  overrideReason?: string | null
  effectiveDate: string
  expiryDate?: string | null
  isActive: boolean
}

// ============================================================================
// CACHE
// ============================================================================

let cachedGlobalFees: PlatformFees | null = null
let cacheTime: number = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Clear the global fees cache (useful after admin updates)
 */
export function clearPlatformFeesCache(): void {
  cachedGlobalFees = null
  cacheTime = 0
}

// ============================================================================
// GLOBAL FEES
// ============================================================================

/**
 * Get global platform fee settings from database (cached for 1 minute)
 *
 * Falls back to hardcoded defaults if database fails:
 * - Session: 70/30 split (mechanic/platform)
 * - Referral: 2%
 * - Workshop quotes: 15%
 * - Escrow: 7 days
 *
 * @returns Platform fee configuration
 *
 * @example
 * const fees = await getPlatformFees()
 * console.log(`Mechanic gets ${fees.sessionMechanicPercent}%`)
 * // => "Mechanic gets 70%"
 */
export async function getPlatformFees(): Promise<PlatformFees> {
  // Return cache if fresh
  if (cachedGlobalFees && Date.now() - cacheTime < CACHE_TTL) {
    return cachedGlobalFees
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('platform_fee_settings')
      .select('*')
      .single()

    if (error) throw error

    if (!data) {
      console.warn('[platformFees] No settings found in database, using defaults')
      return getDefaultFees()
    }

    cachedGlobalFees = {
      sessionMechanicPercent: Number(data.default_session_mechanic_percent),
      sessionPlatformPercent: Number(data.default_session_platform_percent),
      referralFeePercent: Number(data.default_referral_fee_percent),
      workshopQuotePlatformFee: Number(data.default_workshop_quote_platform_fee),
      escrowHoldDays: data.default_escrow_hold_days,
      highValueThresholdCents: data.high_value_threshold_cents,
      highValueEscrowHoldDays: data.high_value_escrow_hold_days,
      enableAutoRelease: data.enable_auto_release,
      requireManualApprovalOverThreshold: data.require_manual_approval_over_threshold,
    }

    cacheTime = Date.now()

    return cachedGlobalFees
  } catch (error) {
    console.error('[platformFees] Failed to load from database, using defaults:', error)
    return getDefaultFees()
  }
}

/**
 * Get hardcoded default fees (fallback when database is unavailable)
 */
function getDefaultFees(): PlatformFees {
  return {
    sessionMechanicPercent: 70,
    sessionPlatformPercent: 30,
    referralFeePercent: 2, // Fixed: was 5%, now 2% per business model
    workshopQuotePlatformFee: 15,
    escrowHoldDays: 7,
    highValueThresholdCents: 100000, // $1000
    highValueEscrowHoldDays: 14,
    enableAutoRelease: true,
    requireManualApprovalOverThreshold: true,
  }
}

// ============================================================================
// WORKSHOP-SPECIFIC OVERRIDES
// ============================================================================

/**
 * Get workshop-specific fee override (if any)
 *
 * Returns null if workshop has no custom fee agreement
 *
 * @param workshopId - Workshop organization ID
 * @returns Workshop fee override or null
 *
 * @example
 * const override = await getWorkshopFeeOverride('workshop-123')
 * if (override?.customQuotePlatformFee) {
 *   console.log(`Workshop gets custom ${override.customQuotePlatformFee}% fee`)
 * }
 */
export async function getWorkshopFeeOverride(
  workshopId: string
): Promise<WorkshopFeeOverride | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error(`[platformFees] Failed to load workshop override for ${workshopId}:`, error)
      return null
    }

    if (!data) return null

    // Check if agreement has expired
    if (data.agreement_end_date) {
      const endDate = new Date(data.agreement_end_date)
      if (endDate < new Date()) {
        console.warn(`[platformFees] Workshop ${workshopId} fee agreement expired`)
        return null
      }
    }

    return {
      workshopId: data.workshop_id,
      customSessionPlatformFee: data.custom_session_platform_fee
        ? Number(data.custom_session_platform_fee)
        : null,
      customQuotePlatformFee: data.custom_quote_platform_fee
        ? Number(data.custom_quote_platform_fee)
        : null,
      customEscrowHoldDays: data.custom_escrow_hold_days,
      agreementType: data.agreement_type,
      agreementNotes: data.agreement_notes,
      isActive: data.is_active,
    }
  } catch (error) {
    console.error(`[platformFees] Exception loading workshop override:`, error)
    return null
  }
}

/**
 * Get effective workshop quote platform fee (custom or global default)
 *
 * @param workshopId - Workshop organization ID
 * @returns Platform fee percentage for this workshop
 *
 * @example
 * const fee = await getWorkshopQuotePlatformFee('workshop-123')
 * console.log(`Workshop pays ${fee}% platform fee`)
 * // => "Workshop pays 12%" (if they have custom agreement)
 * // => "Workshop pays 15%" (if using global default)
 */
export async function getWorkshopQuotePlatformFee(workshopId: string): Promise<number> {
  const override = await getWorkshopFeeOverride(workshopId)

  if (override?.customQuotePlatformFee != null) {
    return override.customQuotePlatformFee
  }

  const globalFees = await getPlatformFees()
  return globalFees.workshopQuotePlatformFee
}

// ============================================================================
// MECHANIC-SPECIFIC OVERRIDES
// ============================================================================

/**
 * Get mechanic-specific referral fee override (if any)
 *
 * Returns null if mechanic uses global default
 *
 * @param mechanicId - Mechanic user ID
 * @returns Mechanic fee override or null
 *
 * @example
 * const override = await getMechanicFeeOverride('mech-123')
 * if (override) {
 *   console.log(`Mechanic gets custom ${override.customReferralFeePercent}% referrals`)
 * }
 */
export async function getMechanicFeeOverride(
  mechanicId: string
): Promise<MechanicFeeOverride | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('mechanic_fee_overrides')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error(`[platformFees] Failed to load mechanic override for ${mechanicId}:`, error)
      return null
    }

    if (!data) return null

    // Check if override has expired
    if (data.expiry_date) {
      const expiryDate = new Date(data.expiry_date)
      if (expiryDate < new Date()) {
        console.warn(`[platformFees] Mechanic ${mechanicId} fee override expired`)
        return null
      }
    }

    // Check if override is effective yet
    const effectiveDate = new Date(data.effective_date)
    if (effectiveDate > new Date()) {
      console.warn(`[platformFees] Mechanic ${mechanicId} fee override not yet effective`)
      return null
    }

    return {
      mechanicId: data.mechanic_id,
      customReferralFeePercent: Number(data.custom_referral_fee_percent),
      overrideReason: data.override_reason,
      effectiveDate: data.effective_date,
      expiryDate: data.expiry_date,
      isActive: data.is_active,
    }
  } catch (error) {
    console.error(`[platformFees] Exception loading mechanic override:`, error)
    return null
  }
}

/**
 * Get effective referral fee for a mechanic (custom or global default)
 *
 * This is the % the mechanic earns when a referred customer approves a quote
 *
 * @param mechanicId - Mechanic user ID
 * @returns Referral fee percentage for this mechanic
 *
 * @example
 * const fee = await getMechanicReferralFee('mech-123')
 * console.log(`Mechanic earns ${fee}% on referrals`)
 * // => "Mechanic earns 3%" (if they have custom override)
 * // => "Mechanic earns 2%" (if using global default)
 */
export async function getMechanicReferralFee(mechanicId: string): Promise<number> {
  const override = await getMechanicFeeOverride(mechanicId)

  if (override?.customReferralFeePercent != null) {
    return override.customReferralFeePercent
  }

  const globalFees = await getPlatformFees()
  return globalFees.referralFeePercent
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Calculate mechanic earnings from session price (uses current session split)
 *
 * @param sessionPriceCents - Session price in cents
 * @returns Mechanic earnings in cents
 *
 * @example
 * const earnings = await calculateMechanicEarnings(2999) // $29.99
 * console.log(`Mechanic gets $${earnings/100}`)
 * // => "Mechanic gets $20.99" (70% of $29.99)
 */
export async function calculateMechanicEarnings(sessionPriceCents: number): Promise<number> {
  const fees = await getPlatformFees()
  return Math.round(sessionPriceCents * (fees.sessionMechanicPercent / 100))
}

/**
 * Calculate platform earnings from session price
 *
 * @param sessionPriceCents - Session price in cents
 * @returns Platform earnings in cents
 */
export async function calculatePlatformEarnings(sessionPriceCents: number): Promise<number> {
  const fees = await getPlatformFees()
  return Math.round(sessionPriceCents * (fees.sessionPlatformPercent / 100))
}

/**
 * Calculate referral fee from repair quote amount
 *
 * @param quoteAmountCents - Quote amount in cents
 * @param mechanicId - Referring mechanic ID (for custom rates)
 * @returns Referral fee in cents
 *
 * @example
 * const fee = await calculateReferralFee(50000, 'mech-123') // $500 quote
 * console.log(`Referral fee: $${fee/100}`)
 * // => "Referral fee: $10" (2% of $500)
 */
export async function calculateReferralFee(
  quoteAmountCents: number,
  mechanicId: string
): Promise<number> {
  const feePercent = await getMechanicReferralFee(mechanicId)
  return Math.round(quoteAmountCents * (feePercent / 100))
}

/**
 * Calculate workshop platform fee from quote amount
 *
 * @param quoteAmountCents - Quote amount in cents
 * @param workshopId - Workshop organization ID (for custom rates)
 * @returns Platform fee in cents
 *
 * @example
 * const fee = await calculateWorkshopPlatformFee(50000, 'workshop-123') // $500 quote
 * console.log(`Platform fee: $${fee/100}`)
 * // => "Platform fee: $75" (15% of $500)
 */
export async function calculateWorkshopPlatformFee(
  quoteAmountCents: number,
  workshopId: string
): Promise<number> {
  const feePercent = await getWorkshopQuotePlatformFee(workshopId)
  return Math.round(quoteAmountCents * (feePercent / 100))
}

/**
 * Get escrow hold days for a payment amount
 *
 * High-value payments ($1000+) held longer if configured
 *
 * @param amountCents - Payment amount in cents
 * @param workshopId - Workshop ID (for custom escrow rules)
 * @returns Days to hold in escrow
 */
export async function getEscrowHoldDays(
  amountCents: number,
  workshopId?: string
): Promise<number> {
  const fees = await getPlatformFees()

  // Check for workshop override
  if (workshopId) {
    const override = await getWorkshopFeeOverride(workshopId)
    if (override?.customEscrowHoldDays != null) {
      return override.customEscrowHoldDays
    }
  }

  // High-value threshold check
  if (amountCents >= fees.highValueThresholdCents) {
    return fees.highValueEscrowHoldDays
  }

  return fees.escrowHoldDays
}
