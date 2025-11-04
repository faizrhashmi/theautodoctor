/**
 * Unified Quotes & Jobs Types
 * Phase 4: Unified "Quotes & Jobs" System
 *
 * These types represent the normalized contract from customer_quote_offers_v
 * which unifies both repair_quotes (direct) and workshop_rfq_bids (RFQ marketplace)
 */

// ============================================
// QUOTE OFFERS (Unified View)
// ============================================

export type QuoteSource = 'direct' | 'rfq'

export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'viewed' | 'approved' | 'modified' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'withdrawn'

export type ProviderType = 'mechanic' | 'workshop' | 'dealership' | 'mobile'

/**
 * Unified quote offer interface
 * Maps to customer_quote_offers_v SQL view
 */
export interface QuoteOffer {
  // Identity
  offerId: string
  source: QuoteSource
  rfqId?: string | null
  sessionId?: string | null
  vehicleId?: string | null
  customerId: string

  // Provider
  workshopId?: string | null
  providerName: string
  providerType: ProviderType

  // Pricing (stored as numbers, displayed in dollars)
  priceTotal: number
  priceLabor: number
  priceParts: number
  platformFee: number

  // Status & Timing
  status: QuoteStatus
  createdAt: string
  sentAt?: string | null
  validUntil: string | null
  customerRespondedAt?: string | null

  // Details
  notes?: string | null
  lineItems?: QuoteLineItem[]
  estimatedDurationHours?: number | null
  warrantyMonths?: number | null
  partsWarrantyMonths?: number | null

  // Metadata
  badges: string[]
  ratingAvg?: number | null
  ratingCount?: number | null
  distanceKm?: number | null
  offerAgeMinutes: number
  canAccept: boolean
}

/**
 * Line item within a quote
 * Stored as JSONB in database
 */
export interface QuoteLineItem {
  id?: string
  type: 'labor' | 'parts' | 'diagnostic' | 'shop_supplies' | 'environmental' | 'other'
  description: string
  quantity?: number
  hours?: number
  rate?: number
  unitPrice?: number
  unitCost?: number
  subtotal: number
  partNumber?: string
  inStock?: boolean
  isOem?: boolean
}

/**
 * Extended quote offer with full details
 * Used for detail pages
 */
export interface QuoteOfferDetail extends QuoteOffer {
  // Workshop details
  workshopAddress?: string
  workshopPhone?: string
  workshopHours?: string
  workshopCertifications?: string[]
  workshopYearsInBusiness?: number

  // Media
  photos?: string[]
  videos?: string[]

  // Reviews
  reviews?: WorkshopReview[]

  // RFQ-specific
  canProvideLoaner?: boolean
  canProvidePickupDropoff?: boolean
  afterHoursAvailable?: boolean
  earliestAvailability?: string
  repairPlan?: string
  alternativeOptions?: string
  warrantyInfo?: string
}

/**
 * Workshop review
 */
export interface WorkshopReview {
  id: string
  rating: number
  comment?: string
  customerName?: string
  createdAt: string
  verifiedPurchase: boolean
  helpfulCount?: number
}

// ============================================
// REPAIR JOBS/ORDERS
// ============================================

export type RepairJobStatus =
  | 'pending_parts'
  | 'parts_received'
  | 'repair_started'
  | 'in_progress'
  | 'waiting_approval'
  | 'quality_check'
  | 'ready_for_pickup'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

export interface RepairJob {
  id: string

  // Source (which offer was accepted)
  quoteId?: string | null
  rfqBidId?: string | null
  source: QuoteSource

  // Parties
  customerId: string
  workshopId: string
  vehicleId?: string | null
  sessionId?: string | null

  // Status
  status: RepairJobStatus

  // Scheduling
  scheduledDate?: string | null
  startedAt?: string | null
  completedAt?: string | null
  pickedUpAt?: string | null

  // Pricing
  quotedPriceCents: number
  finalPriceCents?: number | null

  // Warranty
  warrantyMonths?: number | null
  warrantyCertificateUrl?: string | null

  // Media
  beforePhotos: string[]
  afterPhotos: string[]
  completionVideoUrl?: string | null

  // Change Orders
  changeOrders: ChangeOrder[]

  // Timestamps
  createdAt: string
  updatedAt: string

  // Additional fields from repair_jobs table
  jobNumber?: string | null
  description?: string
  vehicleInfo?: any
  estimatedCompletionDate?: string | null
  estimatedLaborHours?: number | null
  actualLaborHours?: number | null
  partsStatus?: string | null
  partsEta?: string | null
  additionalWorkRequested?: boolean
  qualityCheckPassed?: boolean | null
  finalNotes?: string | null
  pickupScheduledAt?: string | null

  // Workshop details (from join)
  workshopName?: string
  workshopAddress?: string
  workshopPhone?: string

  // Customer details (from join - for workshop view)
  customerName?: string
  customerPhone?: string
  customerEmail?: string

  // Mechanic details (from join)
  mechanicName?: string
}

/**
 * Change order (mid-repair scope changes)
 */
export interface ChangeOrder {
  id: string
  description: string
  additionalCostCents: number
  status: 'pending' | 'approved' | 'declined'
  requestedAt: string
  respondedAt?: string | null
  customerNotes?: string | null
}

/**
 * Job update/activity timeline entry
 */
export type RepairJobUpdateType =
  | 'status_change'
  | 'note_added'
  | 'photo_uploaded'
  | 'change_order_requested'
  | 'change_order_responded'
  | 'message_sent'

export interface RepairJobUpdate {
  id: string
  repairJobId: string

  // Update type
  updateType: RepairJobUpdateType

  // Actor
  createdBy?: string | null
  actorType: 'customer' | 'workshop' | 'system'

  // Content
  title: string
  description?: string | null
  metadata?: Record<string, any>

  // Visibility
  visibleToCustomer: boolean

  // Timestamp
  createdAt: string
}

// ============================================
// FILTERS & SORTING
// ============================================

export interface QuoteOfferFilters {
  status?: 'all' | 'pending' | 'accepted' | 'declined'
  sessionId?: string
  source?: QuoteSource
}

export type QuoteOfferSort = 'newest' | 'price' | 'best' | 'rating'

export interface RepairJobFilters {
  status?: RepairJobStatus | 'all'
  source?: QuoteSource
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GetQuoteOffersResponse {
  offers: QuoteOffer[]
  count: number
  filters?: QuoteOfferFilters
}

export interface GetQuoteOfferDetailResponse {
  offer: QuoteOfferDetail
}

export interface AcceptOfferResponse {
  checkoutUrl: string
  jobId?: string
}

export interface GetRepairJobsResponse {
  jobs: RepairJob[]
  count: number
}

// Alias for consistency with other APIs
export type GetJobsResponse = GetRepairJobsResponse & {
  filters?: {
    status?: 'all' | 'pending' | 'in-progress' | 'history'
  }
}

export interface GetRepairJobDetailResponse {
  job: RepairJob
  updates: RepairJobUpdate[]
}

export interface GetJobUpdatesResponse {
  updates: RepairJobUpdate[]
  count: number
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Helper to format price (cents to dollars)
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Helper to check if offer is expiring soon (< 24h)
 */
export function isExpiringSoon(offer: QuoteOffer): boolean {
  if (!offer.validUntil) return false
  const expiresAt = new Date(offer.validUntil)
  const now = new Date()
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntilExpiry > 0 && hoursUntilExpiry < 24
}

/**
 * Helper to get status color
 */
export function getStatusColor(status: QuoteStatus | RepairJobStatus): string {
  switch (status) {
    case 'pending':
    case 'scheduled':
      return 'yellow'
    case 'accepted':
    case 'approved':
    case 'completed':
      return 'green'
    case 'declined':
    case 'rejected':
    case 'cancelled':
      return 'red'
    case 'in_progress':
    case 'parts_ordered':
    case 'quality_check':
      return 'blue'
    case 'customer_approval':
    case 'ready_pickup':
      return 'orange'
    case 'expired':
    case 'withdrawn':
      return 'gray'
    default:
      return 'slate'
  }
}
