/**
 * RFQ Bid Validation Schemas
 *
 * Shared Zod schemas for workshop bid submission
 * Used by both client-side forms and server-side API routes
 *
 * @module lib/rfq/bidValidation
 */

import { z } from 'zod'

/**
 * Service advisor roles
 */
export const SUBMITTER_ROLES = ['owner', 'admin', 'service_advisor'] as const

export type SubmitterRole = typeof SUBMITTER_ROLES[number]

/**
 * Service Line Item Schema
 *
 * Individual service item with description and price
 * Required for OCPA compliance (itemized breakdown)
 */
export const ServiceLineItemSchema = z.object({
  id: z.string().optional(), // Client-side temporary ID
  description: z.string()
    .min(3, 'Service description must be at least 3 characters')
    .max(500, 'Service description must be less than 500 characters'),
  price: z.number()
    .positive('Price must be positive')
    .max(999999.99, 'Price exceeds maximum allowed'),
  category: z.enum(['parts', 'labor', 'supplies', 'environmental', 'tax', 'other']).optional(),
})

export type ServiceLineItem = z.infer<typeof ServiceLineItemSchema>

/**
 * Zod schema for bid submission
 *
 * Validates all fields required to submit a bid on an RFQ
 * Enforces OCPA compliance (Ontario Consumer Protection Act)
 */
export const SubmitBidSchema = z.object({
  // Required references
  rfq_marketplace_id: z.string().uuid('Invalid RFQ ID'),
  workshop_id: z.string().uuid('Invalid workshop ID'),

  // Workshop info snapshot (auto-filled from workshop profile)
  workshop_name: z.string().min(1, 'Workshop name is required').max(200),
  workshop_city: z.string().max(100).optional(),
  workshop_rating: z.number().min(0).max(5).optional(),
  workshop_review_count: z.number().int().nonnegative().optional(),
  workshop_certifications: z.array(z.string()).max(20).optional(),
  workshop_years_in_business: z.number().int().nonnegative().optional(),

  // Bid amounts (OCPA compliance: itemized breakdown required)
  quote_amount: z.number()
    .positive('Total quote amount must be positive')
    .max(999999.99, 'Quote amount exceeds maximum allowed'),

  parts_cost: z.number()
    .nonnegative('Parts cost cannot be negative')
    .max(999999.99)
    .optional(),

  labor_cost: z.number()
    .nonnegative('Labor cost cannot be negative')
    .max(999999.99)
    .optional(),

  shop_supplies_fee: z.number()
    .nonnegative('Shop supplies fee cannot be negative')
    .max(9999.99)
    .optional(),

  environmental_fee: z.number()
    .nonnegative('Environmental fee cannot be negative')
    .max(999.99)
    .optional(),

  tax_amount: z.number()
    .nonnegative('Tax amount cannot be negative')
    .max(99999.99)
    .optional(),

  // Service line items (for detailed OCPA-compliant breakdown)
  service_items: z.array(ServiceLineItemSchema)
    .min(1, 'At least one service item is required')
    .max(50, 'Maximum 50 service items allowed')
    .optional(),

  // Time estimates
  estimated_completion_days: z.number()
    .int()
    .positive('Completion time must be positive')
    .max(365, 'Completion time cannot exceed 365 days')
    .optional(),

  estimated_labor_hours: z.number()
    .positive('Labor hours must be positive')
    .max(999.99, 'Labor hours exceeds maximum')
    .optional(),

  // Warranty
  parts_warranty_months: z.number()
    .int()
    .nonnegative('Parts warranty cannot be negative')
    .max(120, 'Parts warranty cannot exceed 10 years')
    .optional(),

  labor_warranty_months: z.number()
    .int()
    .nonnegative('Labor warranty cannot be negative')
    .max(120, 'Labor warranty cannot exceed 10 years')
    .optional(),

  warranty_info: z.string()
    .max(1000, 'Warranty info must be less than 1000 characters')
    .optional(),

  // Detailed proposal (required)
  description: z.string()
    .min(50, 'Bid description must be at least 50 characters')
    .max(5000, 'Bid description must be less than 5000 characters'),

  parts_needed: z.string()
    .max(2000, 'Parts list must be less than 2000 characters')
    .optional(),

  repair_plan: z.string()
    .max(3000, 'Repair plan must be less than 3000 characters')
    .optional(),

  alternative_options: z.string()
    .max(2000, 'Alternative options must be less than 2000 characters')
    .optional(),

  // Availability
  earliest_availability_date: z.string()
    .refine(
      (date) => {
        const d = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return d >= today
      },
      { message: 'Availability date cannot be in the past' }
    )
    .optional(),

  can_provide_loaner_vehicle: z.boolean().default(false),
  can_provide_pickup_dropoff: z.boolean().default(false),
  after_hours_service_available: z.boolean().default(false),

  // Submitter info
  submitted_by_role: z.enum(SUBMITTER_ROLES).optional(),
})
  // Cross-field validation: parts_cost + labor_cost should be close to quote_amount
  .refine(
    (data) => {
      if (data.parts_cost !== undefined && data.labor_cost !== undefined) {
        const subtotal = (data.parts_cost || 0) +
                        (data.labor_cost || 0) +
                        (data.shop_supplies_fee || 0) +
                        (data.environmental_fee || 0)
        const total = data.quote_amount

        // Allow for tax and small discrepancies (within 20%)
        const difference = Math.abs(total - subtotal)
        return difference <= total * 0.2
      }
      return true
    },
    {
      message: 'Quote breakdown does not match total amount (parts + labor + fees should be close to quote amount)',
      path: ['quote_amount'],
    }
  )
  // OCPA Compliance: Either service_items OR (parts_cost + labor_cost) must be provided
  .refine(
    (data) => {
      const hasServiceItems = data.service_items && data.service_items.length > 0
      const hasBreakdown = data.parts_cost !== undefined || data.labor_cost !== undefined
      return hasServiceItems || hasBreakdown
    },
    {
      message: 'Ontario Consumer Protection Act requires itemized service breakdown (either service_items or parts_cost/labor_cost)',
      path: ['service_items'],
    }
  )

export type SubmitBidInput = z.infer<typeof SubmitBidSchema>

/**
 * Partial schema for draft bids (no required fields)
 */
export const DraftBidSchema = SubmitBidSchema.partial()

export type DraftBidInput = z.infer<typeof DraftBidSchema>

/**
 * Schema for bid updates (workshop can update pending bids)
 */
export const UpdateBidSchema = SubmitBidSchema.partial().extend({
  bid_id: z.string().uuid('Invalid bid ID'),
})

export type UpdateBidInput = z.infer<typeof UpdateBidSchema>
