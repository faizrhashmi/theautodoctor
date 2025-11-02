/**
 * RFQ Marketplace Detail API Route (Workshop View)
 *
 * Fetches detailed RFQ information for workshops and tracks view
 *
 * @route GET /api/rfq/marketplace/[rfqId]
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

    // Verify user is workshop staff
    const { data: workshopRole, error: roleError } = await supabase
      .from('workshop_roles')
      .select('workshop_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !workshopRole) {
      return NextResponse.json({
        error: 'You must be a workshop staff member to view RFQ details'
      }, { status: 403 })
    }

    // Fetch RFQ details (only open RFQs are visible to workshops)
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
        vehicle_vin,
        vehicle_trim,
        budget_min,
        budget_max,
        bid_deadline,
        max_bids,
        bid_count,
        customer_city,
        customer_province,
        min_workshop_rating,
        required_certifications,
        max_distance_km,
        diagnosis_summary,
        recommended_services,
        created_at,
        metadata
      `)
      .eq('id', rfqId)
      .eq('status', 'open')
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({
        error: 'RFQ not found or no longer accepting bids'
      }, { status: 404 })
    }

    // Check if deadline has passed
    const deadline = new Date(rfq.bid_deadline)
    const now = new Date()
    const isPastDeadline = now > deadline

    // Calculate time remaining
    const hoursRemaining = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
    const isExpiringSoon = hoursRemaining <= 24
    const bidsRemaining = rfq.max_bids - rfq.bid_count

    // Check if this workshop has already submitted a bid
    const { data: existingBid } = await supabase
      .from('workshop_rfq_bids')
      .select('id, created_at, quote_amount, status')
      .eq('rfq_marketplace_id', rfqId)
      .eq('workshop_id', workshopRole.workshop_id)
      .maybeSingle()

    // Track view (upsert to workshop_rfq_views)
    await supabase
      .from('workshop_rfq_views')
      .upsert({
        rfq_marketplace_id: rfqId,
        workshop_id: workshopRole.workshop_id,
        view_count: 1, // Will be incremented by trigger if already exists
        last_viewed_at: new Date().toISOString(),
        submitted_bid: !!existingBid,
      }, {
        onConflict: 'rfq_marketplace_id,workshop_id',
        ignoreDuplicates: false,
      })

    // Return enriched RFQ data
    return NextResponse.json({
      ...rfq,
      hours_remaining: hoursRemaining,
      is_expiring_soon: isExpiringSoon,
      bids_remaining,
      can_bid: bidsRemaining > 0 && !isPastDeadline && !existingBid,
      has_existing_bid: !!existingBid,
      existing_bid: existingBid ? {
        id: existingBid.id,
        created_at: existingBid.created_at,
        quote_amount: existingBid.quote_amount,
        status: existingBid.status,
      } : null,
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ detail fetch error:', error)

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
