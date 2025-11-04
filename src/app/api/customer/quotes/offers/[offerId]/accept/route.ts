/**
 * Accept Quote Offer API (Unified Dispatcher)
 * Phase 4: Dispatches to appropriate checkout based on source
 *
 * POST /api/customer/quotes/offers/[offerId]/accept
 * Body: { source: 'direct' | 'rfq' }
 *
 * Returns: { checkoutUrl: string }
 *
 * Dispatches to:
 * - Direct: POST /api/quotes/[quoteId]/payment/checkout
 * - RFQ: POST /api/rfq/[rfqId]/bids/[bidId]/payment/checkout
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { apiRouteFor, routeFor } from '@/lib/routes'
import type { AcceptOfferResponse } from '@/types/quotes'

export async function POST(
  req: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const { source } = await req.json()

    if (!source || (source !== 'direct' && source !== 'rfq')) {
      return NextResponse.json(
        { error: 'Missing or invalid source (must be "direct" or "rfq")' },
        { status: 400 }
      )
    }

    const { offerId } = params

    console.log(`[ACCEPT-OFFER] Customer ${authResult.data.email} accepting ${source} offer ${offerId}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // ============================================
    // DISPATCH TO APPROPRIATE CHECKOUT
    // ============================================

    if (source === 'direct') {
      // Verify customer owns this quote
      const { data: quote, error } = await supabaseAdmin
        .from('repair_quotes')
        .select('id, customer_id, status')
        .eq('id', offerId)
        .maybeSingle()

      if (error || !quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }

      if (quote.customer_id !== authResult.data.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      if (quote.status !== 'pending' && quote.status !== 'viewed') {
        return NextResponse.json(
          { error: `Quote cannot be accepted in status: ${quote.status}` },
          { status: 400 }
        )
      }

      // Call existing direct quote checkout endpoint
      const checkoutEndpoint = `${req.nextUrl.origin}/api/quotes/${offerId}/payment/checkout`

      const checkoutResponse = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(req.headers.entries()), // Forward cookies for auth
        },
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json().catch(() => ({ error: 'Checkout failed' }))
        console.error('[ACCEPT-OFFER] Direct checkout error:', errorData)
        return NextResponse.json(
          { error: errorData.error || 'Failed to create checkout session' },
          { status: checkoutResponse.status }
        )
      }

      const checkoutData = await checkoutResponse.json()

      const response: AcceptOfferResponse = {
        checkoutUrl: checkoutData.url || checkoutData.checkoutUrl,
      }

      return NextResponse.json(response)
    }

    else if (source === 'rfq') {
      // Verify customer owns the RFQ associated with this bid
      const { data: bid, error } = await supabaseAdmin
        .from('workshop_rfq_bids')
        .select(`
          id,
          status,
          rfq:rfq_marketplace_id (
            id,
            customer_id
          )
        `)
        .eq('id', offerId)
        .maybeSingle()

      if (error || !bid) {
        return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
      }

      if (bid.rfq.customer_id !== authResult.data.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      if (bid.status !== 'pending') {
        return NextResponse.json(
          { error: `Bid cannot be accepted in status: ${bid.status}` },
          { status: 400 }
        )
      }

      // Call existing RFQ bid checkout endpoint
      const checkoutEndpoint = `${req.nextUrl.origin}/api/rfq/${bid.rfq.id}/bids/${offerId}/payment/checkout`

      const checkoutResponse = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(req.headers.entries()), // Forward cookies for auth
        },
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json().catch(() => ({ error: 'Checkout failed' }))
        console.error('[ACCEPT-OFFER] RFQ checkout error:', errorData)
        return NextResponse.json(
          { error: errorData.error || 'Failed to create checkout session' },
          { status: checkoutResponse.status }
        )
      }

      const checkoutData = await checkoutResponse.json()

      const response: AcceptOfferResponse = {
        checkoutUrl: checkoutData.url || checkoutData.checkoutUrl,
      }

      return NextResponse.json(response)
    }

    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  } catch (error: any) {
    console.error('[ACCEPT-OFFER] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
