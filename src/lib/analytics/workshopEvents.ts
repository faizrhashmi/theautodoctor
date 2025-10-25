/**
 * Workshop Event Tracking Service
 * Provides functions to track workshop-related events for analytics
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ============================================================================
// EVENT TYPE DEFINITIONS
// ============================================================================

export type WorkshopEventCategory = 'signup' | 'approval' | 'invitation' | 'email' | 'activity'

export type WorkshopEventType =
  // Signup funnel events
  | 'workshop_signup_started'
  | 'workshop_signup_step_1'
  | 'workshop_signup_step_2'
  | 'workshop_signup_step_3'
  | 'workshop_signup_submitted'
  | 'workshop_signup_success'
  | 'workshop_signup_failed'

  // Approval process events
  | 'workshop_application_viewed'
  | 'workshop_approved'
  | 'workshop_rejected'
  | 'workshop_approval_time'

  // Email events
  | 'email_approval_sent'
  | 'email_approval_failed'
  | 'email_rejection_sent'
  | 'email_rejection_failed'
  | 'email_invite_sent'
  | 'email_invite_failed'

  // Mechanic invitation events
  | 'mechanic_invited'
  | 'mechanic_invite_viewed'
  | 'mechanic_invite_accepted'
  | 'mechanic_invite_expired'

  // Workshop activity events
  | 'workshop_dashboard_accessed'
  | 'workshop_profile_updated'
  | 'workshop_first_mechanic'
  | 'workshop_capacity_reached'

// ============================================================================
// INTERFACES
// ============================================================================

export interface TrackEventParams {
  eventType: WorkshopEventType
  eventCategory: WorkshopEventCategory

  // Entity references (all optional)
  workshopId?: string
  userId?: string
  mechanicId?: string
  adminId?: string

  // Metadata (flexible JSON for additional context)
  metadata?: Record<string, any>

  // Session tracking
  sessionId?: string
  ipAddress?: string
  userAgent?: string

  // Outcome tracking
  success?: boolean
  errorMessage?: string

  // Performance tracking
  durationMs?: number
}

export interface EventTrackingResult {
  success: boolean
  eventId?: string
  error?: string
}

// ============================================================================
// HELPER: Get category from event type
// ============================================================================

function getCategoryFromEventType(eventType: WorkshopEventType): WorkshopEventCategory {
  if (eventType.startsWith('workshop_signup')) return 'signup'
  if (eventType.startsWith('workshop_applic') || eventType.startsWith('workshop_approv') || eventType.startsWith('workshop_reject')) return 'approval'
  if (eventType.startsWith('mechanic_invite')) return 'invitation'
  if (eventType.startsWith('email_')) return 'email'
  return 'activity'
}

// ============================================================================
// MAIN TRACKING FUNCTION
// ============================================================================

/**
 * Track a workshop event
 *
 * @param params - Event tracking parameters
 * @returns Promise with tracking result
 *
 * @example
 * ```typescript
 * await trackWorkshopEvent({
 *   eventType: 'workshop_signup_success',
 *   eventCategory: 'signup',
 *   workshopId: org.id,
 *   userId: user.id,
 *   metadata: { workshopName: org.name }
 * })
 * ```
 */
export async function trackWorkshopEvent(
  params: TrackEventParams
): Promise<EventTrackingResult> {
  try {
    // Auto-detect category if not provided
    const eventCategory = params.eventCategory || getCategoryFromEventType(params.eventType)

    const eventData = {
      event_type: params.eventType,
      event_category: eventCategory,
      workshop_id: params.workshopId || null,
      user_id: params.userId || null,
      mechanic_id: params.mechanicId || null,
      admin_id: params.adminId || null,
      metadata: params.metadata || {},
      session_id: params.sessionId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      success: params.success !== undefined ? params.success : true,
      error_message: params.errorMessage || null,
      duration_ms: params.durationMs || null,
    }

    const { data, error } = await supabaseAdmin
      .from('workshop_events')
      .insert(eventData)
      .select('id')
      .single()

    if (error) {
      console.error('[ANALYTICS] Failed to track event:', params.eventType, error)
      return { success: false, error: error.message }
    }

    console.log(`[ANALYTICS] Event tracked: ${params.eventType}`, data.id)

    return {
      success: true,
      eventId: data.id,
    }
  } catch (e: any) {
    console.error('[ANALYTICS] Unexpected error tracking event:', e)
    // Don't throw - we don't want analytics failures to break the main flow
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS (Specific event types)
// ============================================================================

/**
 * Track workshop signup event
 */
export async function trackSignupEvent(
  eventType: Extract<WorkshopEventType, `workshop_signup_${string}`>,
  params: Omit<TrackEventParams, 'eventType' | 'eventCategory'>
): Promise<EventTrackingResult> {
  return trackWorkshopEvent({
    ...params,
    eventType,
    eventCategory: 'signup',
  })
}

/**
 * Track workshop approval event
 */
export async function trackApprovalEvent(
  eventType: Extract<WorkshopEventType, `workshop_applic${string}` | `workshop_approv${string}` | `workshop_reject${string}`>,
  params: Omit<TrackEventParams, 'eventType' | 'eventCategory'>
): Promise<EventTrackingResult> {
  return trackWorkshopEvent({
    ...params,
    eventType,
    eventCategory: 'approval',
  })
}

/**
 * Track email event
 */
export async function trackEmailEvent(
  eventType: Extract<WorkshopEventType, `email_${string}`>,
  params: Omit<TrackEventParams, 'eventType' | 'eventCategory'>
): Promise<EventTrackingResult> {
  return trackWorkshopEvent({
    ...params,
    eventType,
    eventCategory: 'email',
  })
}

/**
 * Track mechanic invitation event
 */
export async function trackInvitationEvent(
  eventType: Extract<WorkshopEventType, `mechanic_invite${string}`>,
  params: Omit<TrackEventParams, 'eventType' | 'eventCategory'>
): Promise<EventTrackingResult> {
  return trackWorkshopEvent({
    ...params,
    eventType,
    eventCategory: 'invitation',
  })
}

/**
 * Track workshop activity event
 */
export async function trackActivityEvent(
  eventType: Extract<WorkshopEventType, `workshop_dashboard${string}` | `workshop_profile${string}` | `workshop_first${string}` | `workshop_capacity${string}`>,
  params: Omit<TrackEventParams, 'eventType' | 'eventCategory'>
): Promise<EventTrackingResult> {
  return trackWorkshopEvent({
    ...params,
    eventType,
    eventCategory: 'activity',
  })
}

// ============================================================================
// TIMING HELPER
// ============================================================================

/**
 * Helper class to track operation duration
 *
 * @example
 * ```typescript
 * const timer = new EventTimer()
 * // ... do some work
 * await trackWorkshopEvent({
 *   eventType: 'workshop_signup_success',
 *   durationMs: timer.elapsed()
 * })
 * ```
 */
export class EventTimer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  elapsed(): number {
    return Date.now() - this.startTime
  }

  reset(): void {
    this.startTime = Date.now()
  }
}

// ============================================================================
// BULK TRACKING (for efficiency)
// ============================================================================

/**
 * Track multiple events at once
 * Useful for batch operations
 */
export async function trackWorkshopEvents(
  events: TrackEventParams[]
): Promise<EventTrackingResult> {
  try {
    const eventData = events.map((params) => ({
      event_type: params.eventType,
      event_category: params.eventCategory || getCategoryFromEventType(params.eventType),
      workshop_id: params.workshopId || null,
      user_id: params.userId || null,
      mechanic_id: params.mechanicId || null,
      admin_id: params.adminId || null,
      metadata: params.metadata || {},
      session_id: params.sessionId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      success: params.success !== undefined ? params.success : true,
      error_message: params.errorMessage || null,
      duration_ms: params.durationMs || null,
    }))

    const { error } = await supabaseAdmin
      .from('workshop_events')
      .insert(eventData)

    if (error) {
      console.error('[ANALYTICS] Failed to track bulk events:', error)
      return { success: false, error: error.message }
    }

    console.log(`[ANALYTICS] Bulk tracked ${events.length} events`)

    return { success: true }
  } catch (e: any) {
    console.error('[ANALYTICS] Unexpected error tracking bulk events:', e)
    return { success: false, error: e.message || 'Unknown error' }
  }
}

// ============================================================================
// QUERY HELPERS (for dashboards)
// ============================================================================

/**
 * Get event count by type for a date range
 */
export async function getEventCounts(
  startDate: Date,
  endDate: Date,
  eventTypes?: WorkshopEventType[]
) {
  try {
    let query = supabaseAdmin
      .from('workshop_events')
      .select('event_type, count')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[ANALYTICS] Failed to get event counts:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Get events for a specific workshop
 */
export async function getWorkshopEvents(
  workshopId: string,
  limit: number = 100
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_events')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data }
  } catch (e: any) {
    console.error('[ANALYTICS] Failed to get workshop events:', e)
    return { success: false, error: e.message }
  }
}
