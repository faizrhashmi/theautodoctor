/**
 * Quote Offer Detail API
 * Phase 4: Returns detailed offer information (source-aware)
 *
 * GET /api/customer/quotes/offers/[offerId]?source=direct|rfq
 *
 * Fetches full details from either:
 * - repair_quotes (if source=direct)
 * - workshop_rfq_bids (if source=rfq)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { QuoteOfferDetail, GetQuoteOfferDetailResponse } from '@/types/quotes'

export async function GET(
  req: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source') as 'direct' | 'rfq' | null

    if (!source || (source !== 'direct' && source !== 'rfq')) {
      return NextResponse.json(
        { error: 'Missing or invalid source parameter (must be "direct" or "rfq")' },
        { status: 400 }
      )
    }

    const { offerId } = params

    console.log(`[OFFER-DETAIL] Fetching ${source} offer ${offerId} for customer ${authResult.data.email}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    let offerDetail: QuoteOfferDetail | null = null

    // ============================================
    // DIRECT QUOTE DETAIL
    // ============================================
    if (source === 'direct') {
      const { data: quote, error } = await supabaseAdmin
        .from('repair_quotes')
        .select(`
          *,
          workshop:workshop_id (
            id,
            name,
            address,
            city,
            province,
            postal_code,
            phone,
            email,
            business_hours,
            certifications,
            years_in_business
          ),
          mechanic:mechanic_id (
            id,
            name,
            type,
            certifications
          )
        `)
        .eq('id', offerId)
        .maybeSingle()

      if (error) {
        console.error('[OFFER-DETAIL] Direct quote query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch quote details' },
          { status: 500 }
        )
      }

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }

      // ✅ AUTHORIZATION: Verify customer owns this quote
      if (quote.customer_id !== authResult.data.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Fetch workshop reviews if workshop exists
      let reviews: any[] = []
      if (quote.workshop_id) {
        const { data: reviewData } = await supabaseAdmin
          .from('workshop_reviews')
          .select('id, rating, comment, created_at, customer_id')
          .eq('workshop_id', quote.workshop_id)
          .order('created_at', { ascending: false })
          .limit(10)

        reviews = reviewData || []
      }

      // Map to QuoteOfferDetail
      offerDetail = {
        offerId: quote.id,
        source: 'direct',
        rfqId: null,
        sessionId: quote.diagnostic_session_id,
        vehicleId: quote.vehicle_id,
        customerId: quote.customer_id,

        workshopId: quote.workshop_id,
        providerName: quote.workshop?.name || quote.mechanic?.name || 'Unknown Provider',
        providerType: quote.mechanic?.type || 'workshop',

        priceTotal: Number(quote.customer_total ?? 0),
        priceLabor: Number(quote.labor_cost ?? 0),
        priceParts: Number(quote.parts_cost ?? 0),
        platformFee: Number(quote.platform_fee_amount ?? 0),

        status: quote.status,
        createdAt: quote.created_at,
        sentAt: quote.sent_at,
        validUntil: quote.sent_at ? new Date(new Date(quote.sent_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        customerRespondedAt: quote.customer_responded_at,

        notes: quote.notes,
        lineItems: quote.line_items || [],
        estimatedDurationHours: quote.estimated_completion_hours,
        warrantyMonths: quote.warranty_days ? Math.floor(quote.warranty_days / 30) : null,
        partsWarrantyMonths: null,

        badges: quote.mechanic_id ? ['direct', 'mechanic_recommended'] : ['direct'],
        ratingAvg: null, // Will compute from reviews
        ratingCount: reviews.length,
        distanceKm: null,
        offerAgeMinutes: Math.floor((Date.now() - new Date(quote.created_at).getTime()) / (1000 * 60)),
        canAccept: quote.status === 'pending' && (!quote.sent_at || new Date(quote.sent_at).getTime() + 7 * 24 * 60 * 60 * 1000 > Date.now()),

        // Extended details
        workshopAddress: quote.workshop?.address,
        workshopPhone: quote.workshop?.phone,
        workshopHours: quote.workshop?.business_hours,
        workshopCertifications: quote.workshop?.certifications,
        workshopYearsInBusiness: quote.workshop?.years_in_business,

        photos: [], // TODO: Link to session photos
        videos: [],

        reviews: reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          customerName: 'Anonymous', // Privacy
          createdAt: r.created_at,
          verifiedPurchase: true,
        })),
      }

      // Compute average rating
      if (reviews.length > 0) {
        offerDetail.ratingAvg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      }
    }

    // ============================================
    // RFQ BID DETAIL
    // ============================================
    else if (source === 'rfq') {
      const { data: bid, error } = await supabaseAdmin
        .from('workshop_rfq_bids')
        .select(`
          *,
          rfq:rfq_marketplace_id (
            id,
            diagnostic_session_id,
            vehicle_id,
            customer_id,
            title,
            description,
            issue_category,
            urgency,
            diagnosis_summary,
            bid_deadline
          )
        `)
        .eq('id', offerId)
        .maybeSingle()

      if (error) {
        console.error('[OFFER-DETAIL] RFQ bid query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch bid details' },
          { status: 500 }
        )
      }

      if (!bid) {
        return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
      }

      // ✅ AUTHORIZATION: Verify customer owns the RFQ
      if (bid.rfq.customer_id !== authResult.data.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Map to QuoteOfferDetail
      offerDetail = {
        offerId: bid.id,
        source: 'rfq',
        rfqId: bid.rfq_marketplace_id,
        sessionId: bid.rfq.diagnostic_session_id,
        vehicleId: bid.rfq.vehicle_id,
        customerId: bid.rfq.customer_id,

        workshopId: bid.workshop_id,
        providerName: bid.workshop_name,
        providerType: 'workshop',

        priceTotal: Number(bid.quote_amount ?? 0),
        priceLabor: Number(bid.labor_cost ?? 0),
        priceParts: Number(bid.parts_cost ?? 0),
        platformFee: Math.round(Number(bid.quote_amount ?? 0) * 0.12), // Default 12%

        status: bid.status,
        createdAt: bid.created_at,
        sentAt: bid.created_at,
        validUntil: bid.rfq.bid_deadline,
        customerRespondedAt: bid.accepted_at,

        notes: bid.description,
        lineItems: [
          {
            id: '1',
            type: 'labor',
            description: 'Labor',
            hours: bid.estimated_labor_hours || 0,
            subtotal: Number(bid.labor_cost ?? 0),
          },
          {
            id: '2',
            type: 'parts',
            description: bid.parts_needed || 'Parts',
            subtotal: Number(bid.parts_cost ?? 0),
          },
        ],
        estimatedDurationHours: (bid.estimated_completion_days || 0) * 8,
        warrantyMonths: bid.labor_warranty_months,
        partsWarrantyMonths: bid.parts_warranty_months,

        badges: bid.can_provide_loaner_vehicle ? ['rfq', 'loaner_vehicle'] : ['rfq'],
        ratingAvg: bid.workshop_rating,
        ratingCount: bid.workshop_review_count,
        distanceKm: null,
        offerAgeMinutes: Math.floor((Date.now() - new Date(bid.created_at).getTime()) / (1000 * 60)),
        canAccept: bid.status === 'pending' && new Date(bid.rfq.bid_deadline) > new Date(),

        // Extended details
        workshopAddress: null, // Not stored in bid
        workshopPhone: null,
        workshopHours: null,
        workshopCertifications: bid.workshop_certifications,
        workshopYearsInBusiness: bid.workshop_years_in_business,

        photos: [],
        videos: [],
        reviews: [], // TODO: Fetch from workshop_reviews

        canProvideLoaner: bid.can_provide_loaner_vehicle,
        canProvidePickupDropoff: bid.can_provide_pickup_dropoff,
        afterHoursAvailable: bid.after_hours_service_available,
        earliestAvailability: bid.earliest_availability_date,
        repairPlan: bid.repair_plan,
        alternativeOptions: bid.alternative_options,
        warrantyInfo: bid.warranty_info,
      }
    }

    if (!offerDetail) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const response: GetQuoteOfferDetailResponse = {
      offer: offerDetail,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[OFFER-DETAIL] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
