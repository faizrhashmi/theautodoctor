// =====================================================
// Phase 3: Partnership System TypeScript Types
// =====================================================

// =====================================================
// Service Tier Types
// =====================================================

export type ServiceTier =
  | 'virtual_only'        // Can only provide chat/video consultation
  | 'workshop_partner'    // Can provide consultation + physical repair at workshop
  | 'licensed_mobile'     // Licensed mobile repair company (future)

export type PartnershipType =
  | 'none'                // No partnership
  | 'bay_rental'          // Rents bay by day/hour
  | 'revenue_share'       // Splits revenue with workshop
  | 'membership'          // Monthly membership + revenue share
  | 'employee'            // Full-time employee of workshop

// =====================================================
// Workshop Partnership Program Types
// =====================================================

export type ProgramType =
  | 'bay_rental'
  | 'revenue_share'
  | 'membership'

export interface PartnershipProgram {
  id: string
  workshop_id: string

  // Program details
  program_name: string
  program_type: ProgramType
  description?: string | null

  // Bay rental terms
  daily_rate?: number | null
  hourly_rate?: number | null

  // Revenue share terms
  mechanic_percentage?: number | null
  workshop_percentage?: number | null

  // Membership terms
  monthly_fee?: number | null
  included_days_per_month?: number | null
  additional_day_rate?: number | null
  membership_revenue_share_mechanic?: number | null
  membership_revenue_share_workshop?: number | null

  // Program constraints
  min_commitment_months?: number | null
  available_bays?: number | null
  current_partners?: number
  max_partners?: number | null

  // Equipment and benefits
  tools_provided?: boolean
  equipment_list?: string[]
  requirements?: string[]
  benefits?: string[]

  // Status
  is_active?: boolean
  created_at?: string
  updated_at?: string

  // Populated relations
  workshop?: WorkshopInfo
}

export interface WorkshopInfo {
  id: string
  name: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  phone?: string
  email?: string
  business_license_verified?: boolean
  rating?: number
  review_count?: number
}

// =====================================================
// Partnership Application Types
// =====================================================

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export interface PartnershipApplication {
  id: string
  mechanic_id: string
  program_id: string
  workshop_id: string

  // Application status
  status: ApplicationStatus

  // Application details
  proposed_start_date?: string | null
  expected_days_per_month?: number | null
  specializations?: string[]
  tools_owned?: string[]
  message?: string | null
  years_experience?: number | null

  // Workshop response
  workshop_response?: string | null
  approved_terms?: Record<string, any> | null
  rejected_reason?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null

  // Timestamps
  created_at?: string
  updated_at?: string
  expires_at?: string | null

  // Populated relations
  program?: PartnershipProgram
  workshop?: WorkshopInfo
  mechanic?: MechanicInfo
}

export interface MechanicInfo {
  id: string
  full_name: string
  email?: string
  phone?: string
  certifications?: string[]
  red_seal_certified?: boolean
  years_experience?: number
  specializations?: string[]
  rating?: number
  review_count?: number
}

// =====================================================
// Partnership Agreement Types
// =====================================================

export type AgreementType = 'bay_rental' | 'revenue_share' | 'membership'

export interface PartnershipAgreement {
  id: string
  application_id: string
  mechanic_id: string
  workshop_id: string
  program_id: string

  // Agreement details
  agreement_type: AgreementType
  terms: Record<string, any> // Frozen copy of terms at time of signing

  // Contract period
  start_date: string
  end_date?: string | null
  is_active?: boolean

  // Signatures
  mechanic_signed_at?: string | null
  mechanic_signature?: string | null
  workshop_signed_at?: string | null
  workshop_signed_by?: string | null
  workshop_signature?: string | null

  // Documents
  agreement_document_url?: string | null

  // Termination
  terminated_at?: string | null
  terminated_by?: string | null
  termination_reason?: string | null

  created_at?: string
  updated_at?: string

  // Populated relations
  program?: PartnershipProgram
  workshop?: WorkshopInfo
  mechanic?: MechanicInfo
}

// =====================================================
// Bay Booking Types
// =====================================================

export type BayBookingStatus =
  | 'requested'
  | 'confirmed'
  | 'in_use'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface BayBooking {
  id: string
  mechanic_id: string
  workshop_id: string
  agreement_id?: string | null

  // Booking details
  booking_date: string // ISO date string
  start_time: string // HH:MM:SS format
  end_time: string // HH:MM:SS format
  bay_number?: number | null
  bay_name?: string | null

  // Status
  status: BayBookingStatus

  // Associated work
  session_ids?: string[]
  quote_ids?: string[]
  estimated_job_count?: number
  actual_job_count?: number | null

  // Costs (for bay rental model)
  booking_fee?: number | null
  charged?: boolean
  paid?: boolean

  // Confirmation
  requested_at?: string
  confirmed_at?: string | null
  confirmed_by?: string | null

  // Completion
  checked_in_at?: string | null
  checked_out_at?: string | null

  // Notes
  mechanic_notes?: string | null
  workshop_notes?: string | null

  created_at?: string
  updated_at?: string

  // Populated relations
  workshop?: WorkshopInfo
  mechanic?: MechanicInfo
  agreement?: PartnershipAgreement
}

// =====================================================
// Revenue Split Types
// =====================================================

export type SplitType =
  | 'platform_fee_only'   // Only platform fee deducted (employee)
  | 'revenue_share'       // Revenue split between workshop and mechanic
  | 'bay_rental'          // Mechanic pays bay rental fee
  | 'membership'          // Membership fee + revenue split

export interface PartnershipRevenueSplit {
  id: string

  // Related entities
  session_id?: string | null
  quote_id?: string | null
  payment_id?: string | null

  mechanic_id: string
  workshop_id: string
  agreement_id: string
  bay_booking_id?: string | null

  // Revenue breakdown
  total_amount: number
  platform_fee_percentage: number
  platform_fee_amount: number

  subtotal_after_platform_fee: number

  // Workshop share
  workshop_share_percentage: number
  workshop_share_amount: number

  // Mechanic share
  mechanic_share_percentage: number
  mechanic_share_amount: number

  // Additional fees
  bay_rental_fee?: number
  membership_fee_prorated?: number

  // Split details
  split_type: SplitType
  split_terms?: Record<string, any>

  // Payment tracking
  paid_to_mechanic?: boolean
  paid_to_mechanic_at?: string | null
  paid_to_workshop?: boolean
  paid_to_workshop_at?: string | null

  // Reconciliation
  reconciled?: boolean
  reconciled_at?: string | null

  created_at?: string
}

// =====================================================
// Mechanic Client (CRM) Types
// =====================================================

export interface MechanicClient {
  id: string
  mechanic_id: string
  customer_id: string

  // Relationship metrics
  first_service_date?: string | null
  last_service_date?: string | null
  total_services?: number
  total_spent?: number

  // Service breakdown
  virtual_sessions_count?: number
  physical_repairs_count?: number

  // Customer data
  vehicle_info?: Record<string, any> | null
  service_history?: string[]

  // Relationship status
  is_favorite?: boolean
  is_repeat_customer?: boolean

  // Notes and tags
  mechanic_notes?: string | null
  tags?: string[]

  // Follow-up
  next_service_due?: string | null
  last_contact_date?: string | null

  created_at?: string
  updated_at?: string

  // Populated relations
  customer?: CustomerInfo
}

export interface CustomerInfo {
  id: string
  full_name: string
  email?: string
  phone?: string
  vehicles?: VehicleInfo[]
}

export interface VehicleInfo {
  year?: number
  make?: string
  model?: string
  vin?: string
}

// =====================================================
// Earnings Breakdown Types
// =====================================================

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface MechanicEarningsBreakdown {
  id: string
  mechanic_id: string

  // Period
  period_type: PeriodType
  period_start: string
  period_end: string

  // Virtual consultation earnings
  virtual_chat_sessions?: number
  virtual_chat_earnings?: number
  virtual_video_sessions?: number
  virtual_video_earnings?: number
  virtual_total_earnings?: number

  // Physical repair earnings
  physical_repairs_count?: number
  physical_repairs_gross?: number
  physical_repairs_workshop_share?: number
  physical_repairs_net?: number

  // Fees and deductions
  platform_fees_paid?: number
  bay_rental_fees_paid?: number
  membership_fees_paid?: number

  // Total earnings
  gross_earnings?: number
  total_deductions?: number
  net_earnings?: number

  // Metrics
  average_session_value?: number
  sessions_per_day?: number

  created_at?: string
  updated_at?: string
}

// =====================================================
// Request/Response Types for APIs
// =====================================================

// Partnership Program
export interface CreatePartnershipProgramRequest {
  program_name: string
  program_type: ProgramType
  description?: string

  // Bay rental
  daily_rate?: number
  hourly_rate?: number

  // Revenue share
  mechanic_percentage?: number
  workshop_percentage?: number

  // Membership
  monthly_fee?: number
  included_days_per_month?: number
  additional_day_rate?: number
  membership_revenue_share_mechanic?: number
  membership_revenue_share_workshop?: number

  // Constraints
  min_commitment_months?: number
  available_bays?: number
  max_partners?: number

  // Details
  tools_provided?: boolean
  equipment_list?: string[]
  requirements?: string[]
  benefits?: string[]
}

export interface UpdatePartnershipProgramRequest extends Partial<CreatePartnershipProgramRequest> {
  is_active?: boolean
}

// Partnership Application
export interface CreatePartnershipApplicationRequest {
  program_id: string
  proposed_start_date?: string
  expected_days_per_month?: number
  specializations?: string[]
  tools_owned?: string[]
  message?: string
  years_experience?: number
}

export interface ApprovePartnershipApplicationRequest {
  workshop_response?: string
  approved_terms?: Record<string, any>
  start_date: string
  end_date?: string
}

export interface RejectPartnershipApplicationRequest {
  rejected_reason: string
  workshop_response?: string
}

// Bay Booking
export interface CreateBayBookingRequest {
  workshop_id: string
  booking_date: string
  start_time: string
  end_time: string
  bay_number?: number
  estimated_job_count?: number
  mechanic_notes?: string
}

export interface UpdateBayBookingRequest {
  status?: BayBookingStatus
  bay_number?: number
  start_time?: string
  end_time?: string
  workshop_notes?: string
  actual_job_count?: number
}

// Mechanic Service Tier
export interface UpdateServiceTierRequest {
  service_tier: ServiceTier
  partnership_type?: PartnershipType
}

// =====================================================
// Browse/Filter Types
// =====================================================

export interface PartnershipProgramFilters {
  workshop_id?: string
  program_type?: ProgramType
  is_active?: boolean
  city?: string
  province?: string
  max_daily_rate?: number
  min_mechanic_percentage?: number
  tools_provided?: boolean
  search?: string // Search by program name or description
}

export interface BayBookingFilters {
  mechanic_id?: string
  workshop_id?: string
  status?: BayBookingStatus
  date_from?: string
  date_to?: string
  bay_number?: number
}

export interface PartnershipApplicationFilters {
  mechanic_id?: string
  workshop_id?: string
  status?: ApplicationStatus
  program_id?: string
}

// =====================================================
// Dashboard/Analytics Types
// =====================================================

export interface MechanicDashboardStats {
  // Current period (this week/month)
  virtual_sessions_count: number
  virtual_earnings: number
  physical_jobs_count: number
  physical_earnings: number
  total_earnings: number

  // All time
  total_customers: number
  repeat_customers: number
  average_rating: number
  total_reviews: number

  // Upcoming
  pending_sessions: number
  upcoming_bay_bookings: number

  // Partnership
  active_partnerships: number
  partnership_status?: 'none' | 'virtual_only' | 'workshop_partner'
}

export interface WorkshopPartnershipDashboardStats {
  active_partners: number
  pending_applications: number
  total_programs: number

  // This month
  bay_bookings_count: number
  revenue_from_partnerships: number

  // Capacity
  available_bays: number
  utilization_percentage: number
}

// =====================================================
// Utility Types
// =====================================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  code?: string
  details?: Record<string, any>
}
