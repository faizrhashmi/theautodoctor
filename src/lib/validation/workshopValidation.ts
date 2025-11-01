/**
 * Workshop Validation Schemas
 *
 * Centralized Zod validation for workshop commission rates and fees.
 * Enforces DECIMAL(5,2) semantics and business rules.
 */

import { z } from 'zod'
import { WORKSHOP_PRICING, isValidCommissionRate } from '@/config/workshopPricing'

/**
 * Commission Rate Schema
 * Validates commission rate is within allowed bounds (0-85%)
 * Enforces decimal precision: DECIMAL(5,2) semantics
 */
export const CommissionRateSchema = z
  .number({
    required_error: 'Commission rate is required',
    invalid_type_error: 'Commission rate must be a number',
  })
  .min(WORKSHOP_PRICING.MIN_COMMISSION_RATE, {
    message: `Commission rate must be at least ${WORKSHOP_PRICING.MIN_COMMISSION_RATE}%`,
  })
  .max(WORKSHOP_PRICING.MAX_COMMISSION_RATE, {
    message: `Commission rate cannot exceed ${WORKSHOP_PRICING.MAX_COMMISSION_RATE}% (100% - ${WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE}% platform fee)`,
  })
  .refine((val) => !isNaN(val) && isFinite(val), {
    message: 'Commission rate must be a valid number',
  })
  .refine((val) => Number(val.toFixed(2)) === val, {
    message: 'Commission rate must have at most 2 decimal places (DECIMAL(5,2) precision)',
  })
  .refine(isValidCommissionRate, {
    message: `Commission rate must be between ${WORKSHOP_PRICING.MIN_COMMISSION_RATE}% and ${WORKSHOP_PRICING.MAX_COMMISSION_RATE}%`,
  })

/**
 * Workshop Signup Request Schema
 * Validates commission rate input during workshop signup
 */
export const WorkshopSignupSchema = z.object({
  workshopName: z.string().min(1, 'Workshop name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessRegistrationNumber: z.string().min(1, 'Business registration number is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  coveragePostalCodes: z.array(z.string()).min(1, 'At least one coverage postal code is required'),
  commissionRate: CommissionRateSchema.optional().default(WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE),
  website: z.string().optional(),
  industry: z.string().optional(),
  serviceRadiusKm: z.number().optional(),
  mechanicCapacity: z.number().optional(),
})

/**
 * Validate and parse commission rate from unknown input
 * Returns validated rate or default if invalid
 *
 * @param value - Value to validate
 * @returns Validated commission rate
 */
export function validateCommissionRate(value: unknown): {
  success: boolean
  data?: number
  error?: string
} {
  try {
    const result = CommissionRateSchema.safeParse(value)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Invalid commission rate',
    }
  } catch (err) {
    return {
      success: false,
      error: 'Failed to validate commission rate',
    }
  }
}

/**
 * Parse commission rate with fallback to default
 * Logs validation errors but never throws
 *
 * @param value - Value to parse
 * @param context - Context for logging (e.g., "workshop_signup")
 * @returns Validated rate or default
 */
export function parseCommissionRateWithFallback(
  value: unknown,
  context: string = 'unknown'
): number {
  const validation = validateCommissionRate(value)

  if (validation.success && validation.data !== undefined) {
    return validation.data
  }

  console.warn(
    `[COMMISSION VALIDATION] Invalid commission rate in ${context}: ${value}. ` +
      `Error: ${validation.error}. Falling back to default: ${WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE}%`
  )

  return WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE
}
