/**
 * Unified Quote Offers API
 * Phase 4: Returns both direct quotes and RFQ bids in a single unified view
 *
 * GET /api/customer/quotes/offers
 * Query params:
 *   - status: 'all' | 'pending' | 'accepted' | 'declined' (default: 'all')
 *   - sort: 'newest' | 'price' | 'best' | 'rating' (default: 'newest')
 *   - sessionId: filter by diagnostic session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { QuoteOffer, GetQuoteOffersResponse } from '@/types/quotes'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const sessionId = searchParams.get('sessionId')
    const sort = searchParams.get('sort') || 'newest'

    console.log(`[OFFERS] Fetching for customer ${authResult.data.email}, status: ${status}, sort: ${sort}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Query the unified view
    let query = supabaseAdmin
      .from('customer_quote_offers_v')
      .select('*')
      .eq('customer_id', authResult.data.id)

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by session
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    // Apply sorting
    switch (sort) {
      case 'price':
        query = query.order('price_total', { ascending: true })
        break
      case 'best':
        // Best = combination of rating (desc) then price (asc)
        query = query.order('rating_avg', { ascending: false, nullsLast: true })
        query = query.order('price_total', { ascending: true })
        break
      case 'rating':
        query = query.order('rating_avg', { ascending: false, nullsLast: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) {
      console.error('[OFFERS] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch offers', details: error.message },
        { status: 500 }
      )
    }

    // Transform database rows to typed QuoteOffer objects
    const offers: QuoteOffer[] = (data || []).map((row: any) => ({
      offerId: row.offer_id,
      source: row.source,
      rfqId: row.rfq_id,
      sessionId: row.session_id,
      vehicleId: row.vehicle_id,
      customerId: row.customer_id,

      workshopId: row.workshop_id,
      providerName: row.provider_name || 'Unknown Provider',
      providerType: row.provider_type || 'workshop',

      priceTotal: Number(row.price_total ?? 0),
      priceLabor: Number(row.price_labor ?? 0),
      priceParts: Number(row.price_parts ?? 0),
      platformFee: Number(row.platform_fee ?? 0),

      status: row.status,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      validUntil: row.valid_until,
      customerRespondedAt: row.customer_responded_at,

      notes: row.notes,
      lineItems: row.line_items || [],
      estimatedDurationHours: row.estimated_duration_hours,
      warrantyMonths: row.warranty_months,
      partsWarrantyMonths: row.parts_warranty_months,

      badges: row.badges || [],
      ratingAvg: row.rating_avg,
      ratingCount: row.rating_count,
      distanceKm: row.distance_km,
      offerAgeMinutes: Number(row.offer_age_minutes ?? 0),
      canAccept: !!row.can_accept,
    }))

    console.log(`[OFFERS] Returning ${offers.length} offers`)

    const response: GetQuoteOffersResponse = {
      offers,
      count: offers.length,
      filters: {
        status: status as any,
        sessionId: sessionId || undefined,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[OFFERS] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
