/**
 * RFQ Bids API Route
 *
 * Submit and manage workshop bids on RFQ marketplace listings
 *
 * @route POST /api/rfq/bids - Submit new bid
 * @route GET /api/rfq/bids - Get workshop's bids
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'
import { SubmitBidSchema } from '@/lib/rfq/bidValidation'

/**
 * POST: Submit a new bid on an RFQ
 */
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
    const validationResult = SubmitBidSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data

    // Verify user is workshop staff with quote permissions
    const { data: workshopRole, error: roleError } = await supabase
      .from('workshop_roles')
      .select('workshop_id, role, can_send_quotes')
      .eq('user_id', user.id)
      .eq('workshop_id', data.workshop_id)
      .single()

    if (roleError || !workshopRole) {
      return NextResponse.json({
        error: 'Not authorized to submit bids for this workshop'
      }, { status: 403 })
    }

    if (!workshopRole.can_send_quotes) {
      return NextResponse.json({
        error: 'You do not have permission to submit quotes for this workshop'
      }, { status: 403 })
    }

    if (!['owner', 'admin', 'service_advisor'].includes(workshopRole.role)) {
      return NextResponse.json({
        error: 'Only owners, admins, and service advisors can submit bids'
      }, { status: 403 })
    }

    // Verify RFQ exists and is open for bidding
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select(`
        id,
        status,
        bid_deadline,
        max_bids,
        bid_count,
        min_workshop_rating,
        required_certifications
      `)
      .eq('id', data.rfq_marketplace_id)
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    if (rfq.status !== 'open') {
      return NextResponse.json({
        error: `Cannot bid on RFQ with status: ${rfq.status}`
      }, { status: 400 })
    }

    // Check if deadline has passed
    const deadline = new Date(rfq.bid_deadline)
    const now = new Date()
    if (now > deadline) {
      return NextResponse.json({
        error: 'Bidding deadline has passed'
      }, { status: 400 })
    }

    // Check if max bids reached
    if (rfq.bid_count >= rfq.max_bids) {
      return NextResponse.json({
        error: 'Maximum number of bids reached for this RFQ'
      }, { status: 400 })
    }

    // Check if workshop already submitted a bid
    const { data: existingBid, error: bidCheckError } = await supabase
      .from('workshop_rfq_bids')
      .select('id')
      .eq('rfq_marketplace_id', data.rfq_marketplace_id)
      .eq('workshop_id', data.workshop_id)
      .maybeSingle()

    if (bidCheckError) {
      console.error('Bid check error:', bidCheckError)
      return NextResponse.json({ error: 'Failed to verify existing bid' }, { status: 500 })
    }

    if (existingBid) {
      return NextResponse.json({
        error: 'Your workshop has already submitted a bid on this RFQ',
        existing_bid_id: existingBid.id
      }, { status: 409 })
    }

    // Verify workshop meets minimum rating requirement (if any)
    if (rfq.min_workshop_rating) {
      const { data: workshop } = await supabase
        .from('organizations')
        .select('rating')
        .eq('id', data.workshop_id)
        .single()

      if (!workshop?.rating || workshop.rating < rfq.min_workshop_rating) {
        return NextResponse.json({
          error: `Workshop rating (${workshop?.rating || 0}) does not meet minimum requirement (${rfq.min_workshop_rating})`
        }, { status: 400 })
      }
    }

    // Fetch workshop info for snapshot (if not provided)
    let workshopInfo = {
      workshop_name: data.workshop_name,
      workshop_city: data.workshop_city,
      workshop_rating: data.workshop_rating,
      workshop_review_count: data.workshop_review_count,
      workshop_certifications: data.workshop_certifications,
      workshop_years_in_business: data.workshop_years_in_business,
    }

    // If workshop info not provided, fetch from database
    if (!data.workshop_name || !data.workshop_city) {
      const { data: workshop } = await supabase
        .from('organizations')
        .select(`
          name,
          city,
          rating,
          review_count,
          metadata
        `)
        .eq('id', data.workshop_id)
        .single()

      if (workshop) {
        workshopInfo = {
          workshop_name: workshop.name || data.workshop_name,
          workshop_city: workshop.city || data.workshop_city,
          workshop_rating: workshop.rating || data.workshop_rating,
          workshop_review_count: workshop.review_count || data.workshop_review_count,
          workshop_certifications: workshop.metadata?.certifications || data.workshop_certifications,
          workshop_years_in_business: workshop.metadata?.years_in_business || data.workshop_years_in_business,
        }
      }
    }

    // Create bid
    const { data: bid, error: bidError } = await supabase
      .from('workshop_rfq_bids')
      .insert({
        rfq_marketplace_id: data.rfq_marketplace_id,
        workshop_id: data.workshop_id,

        // Workshop info snapshot
        workshop_name: workshopInfo.workshop_name,
        workshop_city: workshopInfo.workshop_city,
        workshop_rating: workshopInfo.workshop_rating,
        workshop_review_count: workshopInfo.workshop_review_count,
        workshop_certifications: workshopInfo.workshop_certifications,
        workshop_years_in_business: workshopInfo.workshop_years_in_business,

        // Bid amounts
        quote_amount: data.quote_amount,
        parts_cost: data.parts_cost,
        labor_cost: data.labor_cost,
        shop_supplies_fee: data.shop_supplies_fee,
        environmental_fee: data.environmental_fee,
        tax_amount: data.tax_amount,

        // Time estimates
        estimated_completion_days: data.estimated_completion_days,
        estimated_labor_hours: data.estimated_labor_hours,

        // Warranty
        parts_warranty_months: data.parts_warranty_months,
        labor_warranty_months: data.labor_warranty_months,
        warranty_info: data.warranty_info,

        // Proposal
        description: data.description,
        parts_needed: data.parts_needed,
        repair_plan: data.repair_plan,
        alternative_options: data.alternative_options,

        // Availability
        earliest_availability_date: data.earliest_availability_date,
        can_provide_loaner_vehicle: data.can_provide_loaner_vehicle,
        can_provide_pickup_dropoff: data.can_provide_pickup_dropoff,
        after_hours_service_available: data.after_hours_service_available,

        // Submitter
        submitted_by_user_id: user.id,
        submitted_by_role: data.submitted_by_role || workshopRole.role,

        // Status
        status: 'pending',

        // Metadata (store service items if provided)
        metadata: data.service_items ? { service_items: data.service_items } : {},
      })
      .select()
      .single()

    if (bidError) {
      console.error('Bid creation error:', bidError)
      return NextResponse.json({
        error: 'Failed to create bid',
        details: bidError.message
      }, { status: 500 })
    }

    // Update or insert workshop_rfq_views to track that workshop submitted bid
    await supabase
      .from('workshop_rfq_views')
      .upsert({
        rfq_marketplace_id: data.rfq_marketplace_id,
        workshop_id: data.workshop_id,
        submitted_bid: true,
        last_viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'rfq_marketplace_id,workshop_id',
        ignoreDuplicates: false,
      })

    // Send notifications (async, don't block response)
    Promise.all([
      // Notify customer
      import('@/lib/rfq/notifications').then(({ notifyCustomerNewBid }) =>
        notifyCustomerNewBid({
          customerId: rfq.customer_id!,
          rfqId: data.rfq_marketplace_id,
          rfqTitle: rfq.title!,
          workshopName: workshopInfo.workshop_name,
          bidAmount: data.quote_amount,
          totalBids: rfq.bid_count + 1,
          maxBids: rfq.max_bids,
        })
      ),
      // Notify mechanic
      import('@/lib/rfq/notifications').then(({ notifyMechanicNewBid }) =>
        notifyMechanicNewBid({
          mechanicId: rfq.escalating_mechanic_id!,
          rfqId: data.rfq_marketplace_id,
          rfqTitle: rfq.title!,
          workshopName: workshopInfo.workshop_name,
          bidAmount: data.quote_amount,
          totalBids: rfq.bid_count + 1,
        })
      ),
    ]).catch(error => console.error('Notification error:', error))

    return NextResponse.json({
      success: true,
      bid_id: bid.id,
      message: 'Bid submitted successfully',
      rfq_id: data.rfq_marketplace_id,
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('Bid submission error:', error)

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

/**
 * GET: Fetch workshop's bids
 */
export async function GET(request: Request) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is workshop staff
    const { data: workshopRole, error: roleError } = await supabase
      .from('workshop_roles')
      .select('workshop_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !workshopRole) {
      return NextResponse.json({
        error: 'You must be a workshop staff member to view bids'
      }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'accepted', 'rejected'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('workshop_rfq_bids')
      .select(`
        id,
        created_at,
        rfq_marketplace_id,
        quote_amount,
        parts_cost,
        labor_cost,
        description,
        status,
        accepted_at,
        rejected_at,
        estimated_completion_days,
        parts_warranty_months,
        labor_warranty_months,
        workshop_rfq_marketplace!inner (
          id,
          title,
          issue_category,
          urgency,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          status,
          bid_deadline,
          customer_city,
          customer_province
        )
      `, { count: 'exact' })
      .eq('workshop_id', workshopRole.workshop_id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: bids, error: bidsError, count } = await query

    if (bidsError) {
      console.error('Bids fetch error:', bidsError)
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
    }

    return NextResponse.json({
      bids: bids || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('Bids fetch error:', error)

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
