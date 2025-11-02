/**
 * Customer RFQs List API Route
 *
 * Fetches all RFQs created by the authenticated customer
 *
 * @route GET /api/rfq/my-rfqs
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'

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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Filter by status
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch customer's RFQs
    let query = supabase
      .from('workshop_rfq_marketplace')
      .select(`
        id,
        title,
        issue_category,
        urgency,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        budget_min,
        budget_max,
        bid_deadline,
        max_bids,
        bid_count,
        status,
        created_at,
        accepted_at,
        accepted_bid_id
      `, { count: 'exact' })
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rfqs, error: rfqsError, count } = await query

    if (rfqsError) {
      console.error('RFQs fetch error:', rfqsError)
      return NextResponse.json({ error: 'Failed to fetch RFQs' }, { status: 500 })
    }

    // Enrich RFQs with calculated fields
    const enrichedRfqs = (rfqs || []).map(rfq => {
      const deadline = new Date(rfq.bid_deadline)
      const now = new Date()
      const hoursRemaining = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
      const isExpired = rfq.status === 'expired' || (rfq.status === 'open' && hoursRemaining === 0)
      const bidsRemaining = rfq.max_bids - rfq.bid_count
      const hasAcceptedBid = rfq.status === 'bid_accepted' || rfq.status === 'converted'

      return {
        ...rfq,
        hours_remaining: hoursRemaining,
        is_expired: isExpired,
        bids_remaining,
        has_accepted_bid: hasAcceptedBid,
      }
    })

    // Calculate summary
    const summary = {
      total_rfqs: count || 0,
      open_rfqs: enrichedRfqs.filter(r => r.status === 'open').length,
      awaiting_selection: enrichedRfqs.filter(r => r.status === 'open' && r.bid_count > 0).length,
      accepted_rfqs: enrichedRfqs.filter(r => r.has_accepted_bid).length,
      expired_rfqs: enrichedRfqs.filter(r => r.is_expired).length,
    }

    return NextResponse.json({
      rfqs: enrichedRfqs,
      summary,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('My RFQs fetch error:', error)

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
