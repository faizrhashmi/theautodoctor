/**
 * RFQ Creation API Route
 *
 * Creates a new RFQ marketplace entry
 *
 * @route POST /api/rfq/create
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'
import { CreateRfqSchema } from '@/lib/rfq/validation'

export async function POST(request: Request) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateRfqSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data

    // Verify user owns the diagnostic session
    const { data: session, error: sessionError } = await supabase
      .from('diagnostic_sessions')
      .select('id, user_id, mechanic_id, diagnosis_summary, recommended_services')
      .eq('id', data.diagnostic_session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Diagnostic session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to create RFQ for this session' }, { status: 403 })
    }

    // Check if mechanic is eligible (not an employee)
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id, partnership_type, service_tier')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanic?.partnership_type === 'employee') {
      return NextResponse.json({
        error: 'Employee mechanics cannot post to RFQ marketplace. Please use direct assignment.'
      }, { status: 403 })
    }

    // Get customer profile for location
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, province, postal_code')
      .eq('id', user.id)
      .single()

    // Calculate bid deadline
    const bid_deadline = new Date()
    bid_deadline.setHours(bid_deadline.getHours() + data.bid_deadline_hours)

    // Create escalation queue entry
    const { data: escalation, error: escalationError } = await supabase
      .from('workshop_escalation_queue')
      .insert({
        diagnostic_session_id: data.diagnostic_session_id,
        customer_id: user.id,
        escalating_mechanic_id: session.mechanic_id,
        escalation_type: 'rfq_marketplace',
        status: 'pending',
        diagnosis_summary: session.diagnosis_summary,
        recommended_services: session.recommended_services,
        rfq_posted_at: new Date().toISOString(),
        rfq_bid_deadline: bid_deadline.toISOString(),
      })
      .select()
      .single()

    if (escalationError) {
      console.error('Escalation creation error:', escalationError)
      return NextResponse.json({ error: 'Failed to create escalation' }, { status: 500 })
    }

    // Create RFQ marketplace entry
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .insert({
        escalation_queue_id: escalation.id,
        customer_id: user.id,
        diagnostic_session_id: data.diagnostic_session_id,
        escalating_mechanic_id: session.mechanic_id,

        // Content
        title: data.title,
        description: data.description,
        issue_category: data.issue_category,
        urgency: data.urgency,

        // Vehicle
        vehicle_id: data.vehicle_id,
        vehicle_make: data.vehicle_make,
        vehicle_model: data.vehicle_model,
        vehicle_year: data.vehicle_year,
        vehicle_mileage: data.vehicle_mileage,
        vehicle_vin: data.vehicle_vin || null,

        // Location (privacy-safe)
        customer_city: profile?.city,
        customer_province: profile?.province,
        customer_postal_code: profile?.postal_code,

        // Diagnosis from mechanic
        diagnosis_summary: session.diagnosis_summary,
        recommended_services: session.recommended_services,

        // Budget
        budget_min: data.budget_min,
        budget_max: data.budget_max,

        // Bidding settings
        bid_deadline,
        max_bids: data.max_bids,
        auto_expire_hours: data.bid_deadline_hours,

        // Workshop filters
        min_workshop_rating: data.min_workshop_rating,
        required_certifications: data.required_certifications,
        max_distance_km: data.max_distance_km,

        // Legal
        customer_consent_to_share_info: true,
        customer_consent_timestamp: new Date().toISOString(),
        referral_fee_disclosed: true,
        referral_disclosure_text: 'Your mechanic will earn a 5% referral fee from the workshop you choose.',

        // Status
        status: 'open',

        // Metadata
        metadata: {
          photos: data.photos,
          videos: data.videos,
          created_via: 'wizard_ui',
        }
      })
      .select()
      .single()

    if (rfqError) {
      console.error('RFQ creation error:', rfqError)

      // Rollback escalation
      await supabase
        .from('workshop_escalation_queue')
        .delete()
        .eq('id', escalation.id)

      return NextResponse.json({ error: 'Failed to create RFQ' }, { status: 500 })
    }

    // Update escalation with RFQ reference
    await supabase
      .from('workshop_escalation_queue')
      .update({ rfq_marketplace_id: rfq.id })
      .eq('id', escalation.id)

    return NextResponse.json({
      success: true,
      rfq_id: rfq.id,
      bid_deadline: rfq.bid_deadline,
      max_bids: rfq.max_bids,
      message: 'RFQ posted successfully to marketplace'
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('RFQ creation error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ marketplace feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
