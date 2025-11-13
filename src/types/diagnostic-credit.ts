/**
 * TypeScript types for Diagnostic Credit System
 *
 * These types support the 48-hour diagnostic credit system where customers
 * who complete a diagnostic session (chat/video) can receive credit toward
 * an in-person diagnostic follow-up with the same mechanic.
 */

/**
 * Diagnostic Pricing Tiers
 * Mechanics can set their own pricing within minimum thresholds
 * Hierarchy enforced: in_person >= video >= chat
 */
export interface MechanicDiagnosticPricing {
  id: string
  mechanic_id: string

  // Pricing (dollars)
  chat_diagnostic_price: number        // Minimum $19
  video_diagnostic_price: number       // Minimum $39
  in_person_diagnostic_price: number   // Minimum $50

  // Descriptions (what's included)
  chat_diagnostic_description?: string | null
  video_diagnostic_description?: string | null
  in_person_diagnostic_description?: string | null

  created_at: string
  updated_at: string
}

/**
 * Diagnostic Session with Credit Fields
 * Extended diagnostic_sessions table with credit tracking
 */
export interface DiagnosticSessionWithCredit {
  id: string
  customer_id: string
  mechanic_id: string
  session_type: 'chat' | 'video'
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  session_price: number
  completed_at?: string | null

  // Credit system fields
  requires_in_person_follow_up: boolean          // Mechanic marks this true
  diagnostic_credit_used: boolean                 // Prevents reuse
  diagnostic_credit_expires_at?: string | null    // 48 hours from completed_at
  in_person_appointment_id?: string | null        // Links to appointment

  created_at: string
  updated_at: string
}

/**
 * Workshop Appointment with Credit Support
 * Extended workshop_appointments table with diagnostic credit tracking
 */
export interface WorkshopAppointmentWithCredit {
  id: string
  customer_user_id: string
  mechanic_id: string
  workshop_id?: string | null

  // Appointment type
  appointment_type: 'new_diagnostic' | 'in_person_follow_up' | 'follow_up_service'

  // Credit tracking
  parent_diagnostic_session_id?: string | null   // Links to parent session
  diagnostic_credit_applied: boolean             // Whether credit was used
  diagnostic_credit_amount: number               // Dollar amount of credit

  // Payment tracking
  total_amount: number                           // Full diagnostic price
  mechanic_diagnostic_price: number              // Mechanic's set price
  platform_commission_percent: number            // 30% for diagnostics, 15% for services

  scheduled_at: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

  // Payment intent tracking
  deposit_payment_intent_id?: string | null
  payment_status: 'pending' | 'deposit_paid' | 'paid_full' | 'refunded'

  vehicle_info?: any
  customer_notes?: string

  created_at: string
  updated_at: string
}

/**
 * Credit Validity Check Result
 * Returned by check_diagnostic_credit_validity() RPC function
 */
export interface DiagnosticCreditInfo {
  has_credit: boolean
  session_id?: string | null
  session_type?: 'chat' | 'video' | null
  credit_amount?: number
  expires_at?: string | null
  hours_remaining?: number
}

/**
 * Payment Request for In-Person Diagnostic
 */
export interface CreateInPersonDiagnosticPaymentRequest {
  mechanicId: string                              // Mechanic user_id
  appointmentId?: string                          // Optional: if appointment pre-created
  parentDiagnosticSessionId?: string              // For follow-up with credit
  applyCredit?: boolean                           // Whether to apply credit
  metadata?: Record<string, any>                  // Additional payment metadata
}

/**
 * Payment Response for In-Person Diagnostic
 */
export interface CreateInPersonDiagnosticPaymentResponse {
  // Payment details
  clientSecret?: string                           // Stripe client secret (if payment needed)
  paymentIntentId?: string                        // Stripe payment intent ID
  isFree: boolean                                 // True if credit covers full amount

  // Pricing breakdown
  diagnosticPrice: number                         // Full diagnostic price
  creditAmount: number                            // Credit applied
  amountToPay: number                             // Customer pays this amount
  creditApplied: boolean                          // Whether credit was used

  // Commission (only if payment required)
  mechanicAmount?: number                         // 70% of amountToPay
  platformCommission?: number                     // 30% of amountToPay

  // Additional info
  mechanicName?: string
  parentSessionId?: string | null
  message?: string
}

/**
 * Appointment Creation Request
 */
export interface CreateInPersonDiagnosticAppointmentRequest {
  mechanicId: string                              // Mechanic user_id
  requestedDate: string                           // ISO date (YYYY-MM-DD)
  requestedTime: string                           // Time (HH:mm)
  vehicleInfo: {
    year?: number
    make?: string
    model?: string
    vin?: string
    plate?: string
  }
  customerNotes?: string
  parentDiagnosticSessionId?: string              // For credit application
  paymentIntentId?: string                        // Stripe payment intent (if paid)
}

/**
 * Appointment Creation Response
 */
export interface CreateInPersonDiagnosticAppointmentResponse {
  success: boolean
  appointment: {
    id: string
    appointment_type: 'new_diagnostic' | 'in_person_follow_up'
    scheduled_at: string
    status: string
    total_amount: number
    diagnostic_credit_applied: boolean
    diagnostic_credit_amount: number
    amount_paid: number
    payment_status: string
    is_free: boolean
  }
  message: string
}

/**
 * Require In-Person Follow-Up Request
 * Mechanic marks a session as needing in-person visit
 */
export interface RequireInPersonFollowUpResponse {
  success: boolean
  message: string
  credit_info: {
    session_id: string
    credit_amount: number
    session_type: 'chat' | 'video'
    expires_at: string
    hours_remaining: number
  }
}

/**
 * Helper: Check if credit is still valid
 */
export function isCreditValid(credit: DiagnosticCreditInfo): boolean {
  if (!credit.has_credit || !credit.expires_at) return false

  const expiresAt = new Date(credit.expires_at)
  const now = new Date()

  return now < expiresAt
}

/**
 * Helper: Calculate amount customer needs to pay
 */
export function calculateAmountToPay(
  diagnosticPrice: number,
  creditAmount: number
): number {
  return Math.max(0, diagnosticPrice - creditAmount)
}

/**
 * Helper: Format hours remaining
 */
export function formatHoursRemaining(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  if (hours < 24) {
    const roundedHours = Math.round(hours * 10) / 10
    return `${roundedHours} hour${roundedHours === 1 ? '' : 's'}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return `${days} day${days === 1 ? '' : 's'}${remainingHours > 0 ? ` ${remainingHours}h` : ''}`
}

/**
 * Constants
 */
export const DIAGNOSTIC_PRICING = {
  // Minimum prices
  CHAT_MIN: 19,
  VIDEO_MIN: 39,
  IN_PERSON_MIN: 50,

  // Recommended prices
  CHAT_RECOMMENDED: 25,
  VIDEO_RECOMMENDED: 50,
  IN_PERSON_RECOMMENDED: 75,

  // Commission rates
  DIAGNOSTIC_COMMISSION: 30,  // 30% for diagnostics
  SERVICE_COMMISSION: 15,      // 15% for follow-up services

  // Credit validity
  CREDIT_HOURS: 48,
} as const

export type AppointmentType = 'new_diagnostic' | 'in_person_follow_up' | 'follow_up_service'
export type SessionType = 'chat' | 'video'
export type PaymentStatus = 'pending' | 'deposit_paid' | 'paid_full' | 'refunded'
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
