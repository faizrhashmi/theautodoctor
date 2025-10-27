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
