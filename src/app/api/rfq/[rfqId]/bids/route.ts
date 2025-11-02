/**
 * RFQ Bids List API Route (Customer View)
 *
 * Fetches all bids submitted on a customer's RFQ
 *
 * @route GET /api/rfq/[rfqId]/bids
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'

export async function GET(
  request: Request,
  { params }: { params: { rfqId: string } }
) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = getSupabaseServer()

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

    // Verify RFQ exists and user is the customer
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, customer_id, status, escalating_mechanic_id, bid_count')
      .eq('id', rfqId)
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    // Authorization: Only customer or escalating mechanic can view bids
    if (rfq.customer_id !== user.id && rfq.escalating_mechanic_id !== user.id) {
      return NextResponse.json({
        error: 'Not authorized to view bids on this RFQ'
      }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort_by') || 'quote_amount' // 'quote_amount', 'rating', 'warranty', 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'asc' // 'asc', 'desc'
    const status = searchParams.get('status') // Filter by status

    // Fetch bids with workshop info
    let query = supabase
      .from('workshop_rfq_bids')
      .select(`
        id,
        created_at,
        workshop_id,
        workshop_name,
        workshop_city,
        workshop_rating,
        workshop_review_count,
        workshop_certifications,
        workshop_years_in_business,
        quote_amount,
        parts_cost,
        labor_cost,
        shop_supplies_fee,
        environmental_fee,
        tax_amount,
        estimated_completion_days,
        estimated_labor_hours,
        parts_warranty_months,
        labor_warranty_months,
        warranty_info,
        description,
        parts_needed,
        repair_plan,
        alternative_options,
        earliest_availability_date,
        can_provide_loaner_vehicle,
        can_provide_pickup_dropoff,
        after_hours_service_available,
        status,
        accepted_at,
        rejected_at,
        metadata
      `)
      .eq('rfq_marketplace_id', rfqId)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply sorting
    const validSortFields = ['quote_amount', 'workshop_rating', 'created_at', 'estimated_completion_days']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'quote_amount'
    const ascending = sortOrder === 'asc'

    query = query.order(sortField, { ascending, nullsLast: true })

    const { data: bids, error: bidsError } = await query

    if (bidsError) {
      console.error('Bids fetch error:', bidsError)
      return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
    }

    // Calculate additional info for each bid
    const enrichedBids = (bids || []).map(bid => {
      // Calculate total warranty months
      const totalWarrantyMonths = (bid.parts_warranty_months || 0) + (bid.labor_warranty_months || 0)

      // Calculate if bid has been reviewed (customer perspective)
      const isReviewed = bid.status !== 'pending'

      // Extract service items from metadata if available
      const serviceItems = bid.metadata?.service_items || []

      return {
        ...bid,
        total_warranty_months: totalWarrantyMonths,
        is_reviewed: isReviewed,
        service_items: serviceItems,
      }
    })

    // Calculate summary statistics
    const summary = {
      total_bids: enrichedBids.length,
      pending_bids: enrichedBids.filter(b => b.status === 'pending').length,
      accepted_bids: enrichedBids.filter(b => b.status === 'accepted').length,
      rejected_bids: enrichedBids.filter(b => b.status === 'rejected').length,
      lowest_bid: enrichedBids.length > 0
        ? Math.min(...enrichedBids.map(b => b.quote_amount))
        : null,
      highest_bid: enrichedBids.length > 0
        ? Math.max(...enrichedBids.map(b => b.quote_amount))
        : null,
      average_bid: enrichedBids.length > 0
        ? enrichedBids.reduce((sum, b) => sum + b.quote_amount, 0) / enrichedBids.length
        : null,
    }

    return NextResponse.json({
      bids: enrichedBids,
      summary,
      rfq_status: rfq.status,
      sorting: {
        sort_by: sortField,
        sort_order: sortOrder,
      },
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ bids fetch error:', error)

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
