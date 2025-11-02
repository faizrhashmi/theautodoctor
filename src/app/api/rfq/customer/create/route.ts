/**
 * Customer Direct RFQ Creation API Route
 *
 * Allows customers to create RFQs directly (bypasses mechanic escalation)
 *
 * @route POST /api/rfq/customer/create
 * @feature ENABLE_CUSTOMER_RFQ
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'
import { z } from 'zod'

// ============================================================================
// Validation Schema
// ============================================================================

const CreateCustomerRfqSchema = z.object({
  vehicle_id: z.string().uuid(),
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(1000),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  customer_consent: z.literal(true),
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
    // Feature flag check (customer-specific flag)
    await requireFeature('ENABLE_CUSTOMER_RFQ')

    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateCustomerRfqSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data

    // Verify user owns the vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', data.vehicle_id)
      .eq('user_id', user.id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found or not owned by you' }, { status: 404 })
    }

    // Get customer profile for location
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, state_province, postal_zip_code, latitude, longitude')
      .eq('id', user.id)
      .single()

    // Step 1: Create a minimal diagnostic_session (required FK)
    const { data: session, error: sessionError } = await supabase
      .from('diagnostic_sessions')
      .insert({
        customer_id: user.id,
        vehicle_id: data.vehicle_id,
        status: 'customer_rfq_created', // Special status for customer-direct
        metadata: {
          source: 'customer_direct_rfq',
          created_via: 'customer_rfq_wizard'
        }
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Diagnostic session creation error:', sessionError)
      return NextResponse.json({ error: 'Failed to create diagnostic session' }, { status: 500 })
    }

    // Calculate bid deadline (default: 72 hours from now)
    const bid_deadline = new Date()
    bid_deadline.setHours(bid_deadline.getHours() + 72)

    // Step 2: Create escalation queue entry (required FK)
    const { data: escalation, error: escalationError } = await supabase
      .from('workshop_escalation_queue')
      .insert({
        diagnostic_session_id: session.id,
        customer_id: user.id,
        escalating_mechanic_id: null, // NULL for customer-direct
        escalation_type: 'rfq_marketplace',
        escalation_status: 'pending',
        status: 'pending',
        rfq_posted_at: new Date().toISOString(),
        rfq_bid_deadline: bid_deadline.toISOString(),
        metadata: {
          source: 'customer_direct',
          created_via: 'customer_rfq_wizard'
        }
      })
      .select()
      .single()

    if (escalationError || !escalation) {
      console.error('Escalation creation error:', escalationError)

      // Rollback diagnostic session
      await supabase
        .from('diagnostic_sessions')
        .delete()
        .eq('id', session.id)

      return NextResponse.json({ error: 'Failed to create escalation queue entry' }, { status: 500 })
    }

    // Step 3: Create RFQ marketplace entry
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .insert({
        escalation_queue_id: escalation.id,
        customer_id: user.id,
        diagnostic_session_id: session.id,
        escalating_mechanic_id: null, // KEY: NULL for customer-direct

        // Content from customer
        title: data.title,
        description: data.description,
        issue_category: data.issue_category,
        urgency: data.urgency,

        // Vehicle info (snapshot)
        vehicle_id: vehicle.id,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        vehicle_year: vehicle.year,
        vehicle_mileage: vehicle.mileage,
        vehicle_vin: vehicle.vin,

        // Location (from profile)
        customer_city: profile?.city,
        customer_province: profile?.state_province,
        customer_postal_code: profile?.postal_zip_code,
        latitude: profile?.latitude,
        longitude: profile?.longitude,

        // Diagnosis summary (customer's description)
        diagnosis_summary: data.description,
        recommended_services: null, // No mechanic recommendations for customer-direct

        // Budget
        budget_min: data.budget_min,
        budget_max: data.budget_max,

        // Bidding settings
        bid_deadline: bid_deadline.toISOString(),
        max_bids: 10, // Default
        auto_expire_hours: 72,

        // Legal compliance
        customer_consent_to_share_info: data.customer_consent,
        customer_consent_timestamp: new Date().toISOString(),
        referral_fee_disclosed: false, // No referral fee for customer-direct
        referral_disclosure_text: null,

        // Status
        status: 'open',

        // Metadata
        metadata: {
          source: 'customer_direct',
          created_via: 'customer_rfq_wizard',
        }
      })
      .select()
      .single()

    if (rfqError) {
      console.error('RFQ creation error:', rfqError)

      // Rollback escalation and session
      await supabase
        .from('workshop_escalation_queue')
        .delete()
        .eq('id', escalation.id)

      await supabase
        .from('diagnostic_sessions')
        .delete()
        .eq('id', session.id)

      return NextResponse.json({ error: 'Failed to create RFQ' }, { status: 500 })
    }

    // Step 4: Link RFQ to escalation queue
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
    console.error('Customer RFQ creation error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'Customer RFQ feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
