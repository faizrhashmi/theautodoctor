/**
 * Mechanic Draft RFQ Creation API Route
 *
 * Allows mechanics to create DRAFT RFQs on behalf of customers after diagnostic sessions
 * Customer must review and approve before RFQ goes to marketplace
 *
 * @route POST /api/mechanic/rfq/create-draft
 * @feature ENABLE_CUSTOMER_RFQ
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'
import { z } from 'zod'

// ============================================================================
// Validation Schema
// ============================================================================

const CreateDraftRfqSchema = z.object({
  diagnostic_session_id: z.string().uuid(),
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(1000),
  recommended_services: z.string().optional(),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  bid_deadline_hours: z.number().int().min(24).max(168).default(72), // 24 hours to 1 week
}).refine(data => {
  if (data.budget_min && data.budget_max) {
    return data.budget_min <= data.budget_max
  }
  return true
}, { message: 'Budget min must be less than or equal to budget max', path: ['budget_max'] })

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: Request) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_CUSTOMER_RFQ')

    const supabase = getSupabaseServer()

    // Auth check - must be a mechanic
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a mechanic
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id, full_name, service_tier, account_type')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateDraftRfqSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data

    // Verify diagnostic session exists and belongs to this mechanic
    const { data: session, error: sessionError } = await supabase
      .from('diagnostic_sessions')
      .select(`
        *,
        vehicles!inner(*),
        customers!inner(id, email, full_name)
      `)
      .eq('id', data.diagnostic_session_id)
      .eq('mechanic_id', mechanic.id)
      .single()

    if (sessionError || !session) {
      console.error('[Mechanic Draft RFQ] Session error:', sessionError)
      return NextResponse.json({ error: 'Diagnostic session not found or not authorized' }, { status: 404 })
    }

    // ✅ IMPORTANT: Validate session recency - Only allow RFQ creation for sessions within last 7 days
    const sessionEndedAt = session.ended_at ? new Date(session.ended_at) : null
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    if (!sessionEndedAt) {
      return NextResponse.json({
        error: 'Cannot create RFQ for incomplete session',
        message: 'The diagnostic session must be completed before creating an RFQ.'
      }, { status: 400 })
    }

    if (sessionEndedAt < sevenDaysAgo) {
      return NextResponse.json({
        error: 'Session too old',
        message: 'RFQs can only be created for diagnostic sessions completed within the last 7 days.'
      }, { status: 400 })
    }

    // Get customer profile for location
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('city, state_province, postal_zip_code, latitude, longitude')
      .eq('id', session.customer_id)
      .single()

    // Calculate bid deadline using mechanic's specified hours (or default 72 hours)
    const bid_deadline = new Date()
    bid_deadline.setHours(bid_deadline.getHours() + data.bid_deadline_hours)

    // Step 1: Create escalation queue entry
    const { data: escalation, error: escalationError } = await supabase
      .from('workshop_escalation_queue')
      .insert({
        diagnostic_session_id: session.id,
        customer_id: session.customer_id,
        escalating_mechanic_id: mechanic.id, // KEY: Track who created it for 2% commission
        escalation_type: 'rfq_marketplace',
        escalation_status: 'draft', // DRAFT status
        status: 'draft',
        rfq_posted_at: null, // Will be set when customer approves
        rfq_bid_deadline: bid_deadline.toISOString(),
        metadata: {
          source: 'mechanic_escalation',
          created_by_mechanic: mechanic.full_name,
          created_via: 'session_completion_wizard',
          referral_enabled: true,
          referral_rate: 0.02
        }
      })
      .select()
      .single()

    if (escalationError || !escalation) {
      console.error('[Mechanic Draft RFQ] Escalation error:', escalationError)
      return NextResponse.json({ error: 'Failed to create escalation queue entry' }, { status: 500 })
    }

    // Step 2: Create DRAFT RFQ marketplace entry
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .insert({
        escalation_queue_id: escalation.id,
        customer_id: session.customer_id,
        diagnostic_session_id: session.id,
        escalating_mechanic_id: mechanic.id, // KEY: Track for referral commission

        // Content pre-filled by mechanic
        title: data.title,
        description: data.description,
        issue_category: data.issue_category,
        urgency: data.urgency,

        // Vehicle info (snapshot from session)
        vehicle_id: session.vehicle_id,
        vehicle_make: session.vehicles.make,
        vehicle_model: session.vehicles.model,
        vehicle_year: session.vehicles.year,
        vehicle_mileage: session.vehicles.mileage,
        vehicle_vin: session.vehicles.vin,

        // Location (from customer profile)
        customer_city: customerProfile?.city,
        customer_province: customerProfile?.state_province,
        customer_postal_code: customerProfile?.postal_zip_code,
        latitude: customerProfile?.latitude,
        longitude: customerProfile?.longitude,

        // Diagnosis summary (from mechanic's diagnostic findings)
        diagnosis_summary: data.recommended_services || data.description,
        recommended_services: data.recommended_services,

        // Budget (mechanic's estimate)
        budget_min: data.budget_min,
        budget_max: data.budget_max,

        // Bidding settings
        bid_deadline: bid_deadline.toISOString(),
        max_bids: 10,
        auto_expire_hours: 72,

        // Legal compliance
        customer_consent_to_share_info: false, // Customer hasn't consented yet
        customer_consent_timestamp: null,
        referral_fee_disclosed: true, // IMPORTANT: Mechanic earns 2% referral
        referral_disclosure_text: 'Your diagnostic mechanic will earn a 2% referral commission if you accept a bid from this RFQ. This does not increase your cost.',

        // Status: DRAFT (customer must approve)
        status: 'draft',
        rfq_status: 'draft', // NEW: Draft status

        // Metadata
        metadata: {
          source: 'mechanic_escalation',
          created_by_mechanic_id: mechanic.id,
          created_by_mechanic_name: mechanic.full_name,
          created_via: 'session_completion_wizard',
          referral_enabled: true,
          referral_rate: 0.02,
          awaiting_customer_approval: true
        }
      })
      .select()
      .single()

    if (rfqError) {
      console.error('[Mechanic Draft RFQ] RFQ creation error:', rfqError)

      // Rollback escalation
      await supabase
        .from('workshop_escalation_queue')
        .delete()
        .eq('id', escalation.id)

      return NextResponse.json({ error: 'Failed to create draft RFQ' }, { status: 500 })
    }

    // Step 3: Link RFQ to escalation queue
    await supabase
      .from('workshop_escalation_queue')
      .update({ rfq_marketplace_id: rfq.id })
      .eq('id', escalation.id)

    // Step 4: Send notification to customer
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: session.customer_id,
          type: 'rfq_draft_ready',
          payload: {
            rfq_id: rfq.id,
            mechanic_name: mechanic.full_name,
            session_id: session.id,
            title: data.title,
            message: 'Your mechanic has prepared a repair request for you to review and submit.'
          }
        })

      console.log('[Mechanic Draft RFQ] Notification sent to customer')
    } catch (notifError) {
      console.warn('[Mechanic Draft RFQ] Failed to send notification:', notifError)
      // Non-critical - don't fail the request
    }

    return NextResponse.json({
      success: true,
      rfq_id: rfq.id,
      status: 'draft',
      bid_deadline: rfq.bid_deadline,
      customer_id: session.customer_id,
      message: 'Draft RFQ created successfully. Customer will be notified to review and approve.'
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('[Mechanic Draft RFQ] Error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
