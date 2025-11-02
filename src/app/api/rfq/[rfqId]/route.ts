/**
 * RFQ Details API Route
 *
 * Fetches details for a specific RFQ
 *
 * @route GET /api/rfq/[rfqId]
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireFeature } from '@/lib/flags'

export async function GET(
  request: Request,
  { params }: { params: { rfqId: string } }
) {
  try {
    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = createClient({ cookies })

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rfqId = params.rfqId

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rfqId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID format' }, { status: 400 })
    }

    // Fetch RFQ details
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select(`
        id,
        title,
        description,
        issue_category,
        urgency,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_mileage,
        budget_min,
        budget_max,
        bid_deadline,
        max_bids,
        max_distance_km,
        min_workshop_rating,
        required_certifications,
        status,
        customer_id,
        escalating_mechanic_id,
        created_at,
        metadata
      `)
      .eq('id', rfqId)
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    // Authorization check: Only customer or escalating mechanic can view
    if (rfq.customer_id !== user.id && rfq.escalating_mechanic_id !== user.id) {
      return NextResponse.json({
        error: 'Not authorized to view this RFQ'
      }, { status: 403 })
    }

    // Return RFQ details
    return NextResponse.json(rfq, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ fetch error:', error)

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
