/**
 * Admin Quotes API - All Quotes from All Sources
 * Phase 4: Admin control center - view all quotes across the platform
 *
 * GET /api/admin/quotes?status=all|pending|accepted|expired&source=all|direct|rfq
 *
 * Returns: { quotes: QuoteOffer[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { QuoteOffer } from '@/types/quotes'

interface GetAdminQuotesResponse {
  quotes: QuoteOffer[]
  count: number
  filters?: {
    status?: string
    source?: string
  }
}

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'
    const sourceFilter = searchParams.get('source') || 'all'

    console.log(
      `[ADMIN-QUOTES] Admin ${authResult.data.email} fetching quotes (status: ${statusFilter}, source: ${sourceFilter})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Query the unified view (admin sees ALL quotes, no customer_id filter)
    let query = supabaseAdmin
      .from('customer_quote_offers_v')
      .select('*')

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter)
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[ADMIN-QUOTES] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    // Transform to typed QuoteOffer objects
    const quotes: QuoteOffer[] = (data || []).map((row: any) => ({
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

    const response: GetAdminQuotesResponse = {
      quotes,
      count: quotes.length,
      filters: {
        status: statusFilter,
        source: sourceFilter,
      },
    }

    console.log(
      `[ADMIN-QUOTES] Returning ${quotes.length} quotes (status: ${statusFilter}, source: ${sourceFilter})`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[ADMIN-QUOTES] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
