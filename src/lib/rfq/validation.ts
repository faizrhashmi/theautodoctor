/**
 * RFQ Validation Schemas
 *
 * Shared Zod schemas for RFQ marketplace
 * Used by both client-side forms and server-side API routes
 *
 * @module lib/rfq/validation
 */

import { z } from 'zod'

/**
 * Service categories for RFQ
 */
export const SERVICE_CATEGORIES = [
  'engine',
  'brakes',
  'electrical',
  'suspension',
  'transmission',
  'ac_heating',
  'diagnostic',
  'maintenance',
  'other'
] as const

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]

/**
 * Urgency levels for RFQ
 */
export const URGENCY_LEVELS = ['low', 'normal', 'high', 'urgent'] as const

export type UrgencyLevel = typeof URGENCY_LEVELS[number]

/**
 * Zod schema for RFQ creation
 *
 * Validates all fields required to create an RFQ
 */
export const CreateRfqSchema = z.object({
  // Diagnostic session reference
  diagnostic_session_id: z.string().uuid('Invalid session ID'),

  // Vehicle info
  vehicle_id: z.string().uuid().optional(),
  vehicle_year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  vehicle_make: z.string().min(1, 'Make is required').max(100),
  vehicle_model: z.string().min(1, 'Model is required').max(100),
  vehicle_trim: z.string().max(100).optional(),
  vehicle_mileage: z.number().int().positive('Mileage must be positive'),
  vehicle_vin: z.string().length(17, 'VIN must be 17 characters').optional().or(z.literal('')),

  // Issue details
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  issue_category: z.enum(SERVICE_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a service category' })
  }),
  urgency: z.enum(URGENCY_LEVELS).default('normal'),

  // Photos/videos (URLs from storage)
  photos: z.array(z.string().url()).max(10, 'Maximum 10 photos allowed').default([]),
  videos: z.array(z.string().url()).max(3, 'Maximum 3 videos allowed').default([]),

  // Budget (optional)
  budget_min: z.number().positive('Minimum budget must be positive').optional(),
  budget_max: z.number().positive('Maximum budget must be positive').optional(),

  // Workshop filters (optional)
  min_workshop_rating: z.number().min(0).max(5).optional(),
  required_certifications: z.array(z.string()).max(10).optional(),
  max_distance_km: z.number().int().positive().max(200, 'Maximum distance is 200km').optional(),

  // Bidding settings
  bid_deadline_hours: z.number().int()
    .min(24, 'Minimum bidding window is 24 hours')
    .max(168, 'Maximum bidding window is 7 days')
    .default(72),
  max_bids: z.number().int()
    .min(3, 'Minimum 3 bids')
    .max(20, 'Maximum 20 bids')
    .default(10),

  // Legal consent (required)
  customer_consent_to_share_info: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to share information with workshops' })
  }),
})
  // Cross-field validation: budget_max >= budget_min
  .refine(data => {
    if (data.budget_min && data.budget_max) {
      return data.budget_max >= data.budget_min
    }
    return true
  }, {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['budget_max']
  })

export type CreateRfqInput = z.infer<typeof CreateRfqSchema>

/**
 * Partial schema for draft RFQs (no required fields)
 */
export const DraftRfqSchema = CreateRfqSchema.partial()

export type DraftRfqInput = z.infer<typeof DraftRfqSchema>
