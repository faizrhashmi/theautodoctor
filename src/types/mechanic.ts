// =====================================================
// Mechanic Types
// =====================================================

import type { ServiceTier, PartnershipType } from './partnership'

export interface MechanicProfile {
  id: string
  user_id?: string
  full_name: string
  email: string
  phone?: string | null

  // Certification
  certifications?: string[]
  red_seal_certified?: boolean
  certification_number?: string | null
  certification_province?: string | null
  years_experience?: number

  // Specializations
  specializations?: string[]
  makes_serviced?: string[] // Car makes they specialize in

  // Service Tier (Phase 3)
  service_tier: ServiceTier
  partnership_type?: PartnershipType | null
  can_perform_physical_work?: boolean
  prefers_virtual?: boolean
  prefers_physical?: boolean

  // Workshop affiliation
  workshop_id?: string | null
  workshop_name?: string | null

  // Mobile license (future - Phase 7)
  mobile_license_number?: string | null
  mobile_license_expiry?: string | null
  mobile_license_province?: string | null

  // Profile
  bio?: string | null
  profile_photo_url?: string | null
  hourly_rate?: number | null

  // Ratings and reviews
  rating?: number | null
  review_count?: number
  total_jobs_completed?: number

  // Status
  is_active?: boolean
  is_verified?: boolean
  onboarding_completed?: boolean
  background_check_status?: 'pending' | 'approved' | 'rejected' | null

  // Timestamps
  created_at?: string
  updated_at?: string

  // Partnership terms (if workshop_partner)
  partnership_terms?: Record<string, any> | null
}

export interface MechanicSettings {
  mechanic_id: string

  // Notification preferences
  email_notifications?: boolean
  sms_notifications?: boolean
  push_notifications?: boolean

  // Availability
  auto_accept_sessions?: boolean
  max_daily_sessions?: number
  buffer_between_sessions?: number // minutes

  // Payment
  preferred_payout_method?: 'bank_transfer' | 'stripe' | null
  payout_schedule?: 'weekly' | 'bi_weekly' | 'monthly' | null

  updated_at?: string
}

export type { ServiceTier, PartnershipType }

// =====================================================
// Mechanic Type Classification & Payment Routing
// =====================================================

/**
 * Mechanic types in the platform (business model classification)
 */
export enum MechanicType {
  /** Virtual-only mechanics: Remote diagnostics only, earn 70% + 2% referrals */
  VIRTUAL_ONLY = 'virtual_only',

  /** Independent mechanics with workshop: Own shop, 70/30 sessions, workshop rates for quotes */
  INDEPENDENT_WORKSHOP = 'independent_workshop',

  /** Workshop-affiliated mechanics: Employees/contractors, workshop gets paid */
  WORKSHOP_AFFILIATED = 'workshop_affiliated',
}

/**
 * Minimal mechanic data needed for type detection
 */
export interface MechanicTypeData {
  service_tier: string | null
  account_type: string | null
  workshop_id: string | null
  partnership_type: string | null
  can_perform_physical_work?: boolean | null
  user_id?: string | null // Needed to check workshop ownership
}

/**
 * Payment destination for session/quote payments
 */
export interface PaymentDestination {
  /** Who gets paid: mechanic directly or their workshop */
  type: 'mechanic' | 'workshop'

  /** Stripe Connect account ID */
  accountId: string | null

  /** Human-readable name for logging */
  payeeName: string

  /** Additional context for metadata */
  context: {
    mechanic_id: string
    workshop_id?: string | null
    mechanic_type: MechanicType
  }
}

/**
 * Determine mechanic type from database fields
 *
 * Business Logic:
 * - No workshop_id = Virtual-only
 * - Has workshop_id + account_type='workshop' = Workshop employee
 * - Has workshop_id + account_type='independent' = Independent with workshop
 *
 * @param mechanic - Mechanic record with type classification fields
 * @returns MechanicType enum value
 */
export function getMechanicType(mechanic: MechanicTypeData): MechanicType {
  // No workshop affiliation = virtual only
  if (!mechanic.workshop_id) {
    return MechanicType.VIRTUAL_ONLY
  }

  // Has workshop, account type 'workshop_mechanic' = employee/contractor
  if (mechanic.account_type === 'workshop_mechanic') {
    return MechanicType.WORKSHOP_AFFILIATED
  }

  // Has workshop, account type 'individual_mechanic' = owns workshop (owner/operator)
  // Note: This matches the database trigger which sets account_type='individual_mechanic' for owners
  if (mechanic.account_type === 'individual_mechanic') {
    return MechanicType.INDEPENDENT_WORKSHOP
  }

  // Legacy: also check for 'independent' for backwards compatibility
  if (mechanic.account_type === 'independent') {
    return MechanicType.INDEPENDENT_WORKSHOP
  }

  // Fallback based on partnership type
  if (mechanic.partnership_type === 'employee' || mechanic.partnership_type === 'contractor') {
    return MechanicType.WORKSHOP_AFFILIATED
  }

  // Default to virtual only if unclear
  return MechanicType.VIRTUAL_ONLY
}

/**
 * Get payment destination for session payments
 *
 * Business Rules:
 * - Virtual-only: Pay mechanic directly (70%)
 * - Independent workshop: Pay mechanic directly (70%)
 * - Workshop-affiliated: Pay WORKSHOP (not mechanic) - workshop handles mechanic payment
 *
 * @param mechanic - Mechanic record with payment routing fields
 * @returns Payment destination with Stripe account ID
 *
 * @throws Error if neither mechanic nor workshop has Stripe account connected
 */
export function getSessionPaymentDestination(mechanic: {
  id: string
  name?: string | null
  stripe_account_id: string | null
  stripe_payouts_enabled?: boolean | null
  workshop_id: string | null
  account_type: string | null
  service_tier?: string | null
  partnership_type?: string | null
  organizations?: {
    id?: string
    name: string
    stripe_account_id: string | null
    stripe_payouts_enabled?: boolean | null
  } | null
}): PaymentDestination {
  const mechanicType = getMechanicType(mechanic)

  switch (mechanicType) {
    case MechanicType.VIRTUAL_ONLY:
    case MechanicType.INDEPENDENT_WORKSHOP:
      // Independent mechanics get paid directly
      return {
        type: 'mechanic',
        accountId: mechanic.stripe_account_id,
        payeeName: mechanic.name || 'Mechanic',
        context: {
          mechanic_id: mechanic.id,
          workshop_id: mechanic.workshop_id,
          mechanic_type: mechanicType,
        },
      }

    case MechanicType.WORKSHOP_AFFILIATED:
      // Workshop-affiliated: Pay the workshop (they handle mechanic payment)
      if (!mechanic.organizations) {
        throw new Error(
          `Workshop-affiliated mechanic ${mechanic.id} has no organization data loaded`
        )
      }

      return {
        type: 'workshop',
        accountId: mechanic.organizations.stripe_account_id,
        payeeName: mechanic.organizations.name,
        context: {
          mechanic_id: mechanic.id,
          workshop_id: mechanic.workshop_id,
          mechanic_type: mechanicType,
        },
      }
  }
}

/**
 * Get mechanic type description for UI display
 */
export function getMechanicTypeDescription(type: MechanicType): string {
  switch (type) {
    case MechanicType.VIRTUAL_ONLY:
      return 'Virtual-Only Mechanic'
    case MechanicType.INDEPENDENT_WORKSHOP:
      return 'Independent Workshop Owner'
    case MechanicType.WORKSHOP_AFFILIATED:
      return 'Workshop-Affiliated Mechanic'
  }
}

/**
 * Get mechanic type explanation for UI tooltip/help text
 */
export function getMechanicTypeExplanation(type: MechanicType): string {
  switch (type) {
    case MechanicType.VIRTUAL_ONLY:
      return 'You provide remote video diagnostics. Earn 70% on sessions + 2% referral fees when customers approve workshop quotes.'
    case MechanicType.INDEPENDENT_WORKSHOP:
      return 'You own your workshop. Earn 70% on virtual sessions, and receive workshop rates on repair quotes you accept.'
    case MechanicType.WORKSHOP_AFFILIATED:
      return 'You work for a workshop. Session payments go to your workshop, who handles your compensation.'
  }
}

/**
 * Check if mechanic can create quotes
 */
export function canCreateQuotes(mechanic: MechanicTypeData): boolean {
  const type = getMechanicType(mechanic)

  switch (type) {
    case MechanicType.VIRTUAL_ONLY:
      return false // Must escalate to workshops
    case MechanicType.INDEPENDENT_WORKSHOP:
      return true // Own shop, can quote
    case MechanicType.WORKSHOP_AFFILIATED:
      return false // Role-based (checked separately via workshop_roles table)
  }
}

/**
 * Check if mechanic can perform physical repairs
 */
export function canPerformPhysicalWork(mechanic: MechanicTypeData): boolean {
  const type = getMechanicType(mechanic)

  return type !== MechanicType.VIRTUAL_ONLY || mechanic.can_perform_physical_work === true
}

/**
 * Check if mechanic can access personal earnings
 *
 * Business Rules:
 * - Virtual-only: YES (they earn 70% directly)
 * - Independent workshop owner: YES (they earn 70% on sessions)
 * - Workshop employee: NO (workshop gets paid, not them)
 */
export function canAccessEarnings(mechanic: MechanicTypeData): boolean {
  const type = getMechanicType(mechanic)
  return type !== MechanicType.WORKSHOP_AFFILIATED
}

/**
 * Check if mechanic is an owner/operator (has both mechanic AND workshop owner access)
 *
 * Owner/operators are mechanics with account_type='individual_mechanic' AND workshop_id set.
 * They can switch between:
 * - Mechanic View: Their personal diagnostic sessions and earnings
 * - Workshop Owner View: Business management, employee management, workshop earnings
 */
export function isOwnerOperator(mechanic: MechanicTypeData): boolean {
  return getMechanicType(mechanic) === MechanicType.INDEPENDENT_WORKSHOP
}

/**
 * Get dashboard header title based on mechanic type
 */
export function getDashboardTitle(type: MechanicType): string {
  switch (type) {
    case MechanicType.VIRTUAL_ONLY:
      return 'Virtual Diagnostics Dashboard'
    case MechanicType.INDEPENDENT_WORKSHOP:
      return 'Workshop Partner Dashboard'
    case MechanicType.WORKSHOP_AFFILIATED:
      return 'Mechanic Dashboard'
  }
}
