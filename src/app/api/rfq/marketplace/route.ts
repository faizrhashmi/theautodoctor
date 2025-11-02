/**
 * RFQ Marketplace List API Route
 *
 * Fetches list of open RFQs for workshops to browse and bid on
 *
 * @route GET /api/rfq/marketplace
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireFeature } from '@/lib/flags'

export async function GET(request: Request) {
  try {
    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = createClient({ cookies })

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is workshop staff with quote permissions
    const { data: workshopRole, error: roleError } = await supabase
      .from('workshop_roles')
      .select('workshop_id, role, can_send_quotes')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'service_advisor'])
      .eq('can_send_quotes', true)
      .single()

    if (roleError || !workshopRole) {
      return NextResponse.json({
        error: 'You must be a workshop staff member with quote permissions to view RFQ marketplace'
      }, { status: 403 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const urgency = searchParams.get('urgency')
    const minBudget = searchParams.get('min_budget')
    const maxBudget = searchParams.get('max_budget')
    const maxDistance = searchParams.get('max_distance') // in km
    const hideAlreadyBid = searchParams.get('hide_already_bid') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
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
        bid_count,
        customer_city,
        customer_province,
        min_workshop_rating,
        required_certifications,
        max_distance_km,
        created_at,
        metadata
      `, { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('issue_category', category)
    }

    if (urgency) {
      query = query.eq('urgency', urgency)
    }

    if (minBudget) {
      query = query.gte('budget_max', parseFloat(minBudget))
    }

    if (maxBudget) {
      query = query.lte('budget_min', parseFloat(maxBudget))
    }

    // Filter by workshop rating requirement
    // Get workshop's rating
    const { data: workshop } = await supabase
      .from('organizations')
      .select('rating')
      .eq('id', workshopRole.workshop_id)
      .single()

    if (workshop?.rating) {
      query = query.or(`min_workshop_rating.is.null,min_workshop_rating.lte.${workshop.rating}`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rfqs, error: rfqsError, count } = await query

    if (rfqsError) {
      console.error('RFQ fetch error:', rfqsError)
      return NextResponse.json({ error: 'Failed to fetch RFQs' }, { status: 500 })
    }

    // If requested, filter out RFQs this workshop has already bid on
    let filteredRfqs = rfqs || []

    if (hideAlreadyBid && filteredRfqs.length > 0) {
      const rfqIds = filteredRfqs.map(rfq => rfq.id)

      const { data: existingBids } = await supabase
        .from('workshop_rfq_bids')
        .select('rfq_marketplace_id')
        .eq('workshop_id', workshopRole.workshop_id)
        .in('rfq_marketplace_id', rfqIds)

      const biddenRfqIds = new Set(existingBids?.map(b => b.rfq_marketplace_id) || [])
      filteredRfqs = filteredRfqs.filter(rfq => !biddenRfqIds.has(rfq.id))
    }

    // Calculate time remaining for each RFQ
    const enrichedRfqs = filteredRfqs.map(rfq => {
      const deadline = new Date(rfq.bid_deadline)
      const now = new Date()
      const hoursRemaining = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
      const isExpiringSoon = hoursRemaining <= 24
      const bidsRemaining = rfq.max_bids - rfq.bid_count

      return {
        ...rfq,
        hours_remaining: hoursRemaining,
        is_expiring_soon: isExpiringSoon,
        bids_remaining: bidsRemaining,
        can_bid: bidsRemaining > 0 && hoursRemaining > 0,
      }
    })

    // Track view (insert or update workshop_rfq_views)
    // Note: We don't track views for the list page, only for detail views
    // This prevents inflating view counts when workshops browse

    return NextResponse.json({
      rfqs: enrichedRfqs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
      filters: {
        category,
        urgency,
        min_budget: minBudget,
        max_budget: maxBudget,
        max_distance: maxDistance,
        hide_already_bid: hideAlreadyBid,
      },
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ marketplace error:', error)

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
