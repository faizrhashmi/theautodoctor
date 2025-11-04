/**
 * RFQ Bid Payment Checkout API
 * Phase 1.4: RFQ bid acceptance + Stripe
 *
 * Creates Stripe checkout session for RFQ bid payment with escrow
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'
import { routeFor } from '@/lib/routes'

export async function POST(
  req: NextRequest,
  { params }: { params: { rfqId: string; bidId: string } }
) {
  const { rfqId, bidId } = params

  try {
    const supabase = getSupabaseServer()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch RFQ to verify ownership
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, customer_id, status, title')
      .eq('id', rfqId)
      .maybeSingle()

    if (rfqError || !rfq) {
      console.error('[rfq-bid-payment] RFQ not found:', rfqError)
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    // Verify RFQ belongs to authenticated user
    if (rfq.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify RFQ is in acceptable status
    if (!['open', 'under_review'].includes(rfq.status)) {
      return NextResponse.json(
        { error: `Cannot accept bid on RFQ with status: ${rfq.status}` },
        { status: 400 }
      )
    }

    // Fetch bid details with workshop info
    const { data: bid, error: bidError } = await supabase
      .from('workshop_rfq_bids')
      .select(
        `
        id,
        rfq_marketplace_id,
        workshop_id,
        workshop_name,
        quote_amount,
        parts_cost,
        labor_cost,
        status
      `
      )
      .eq('id', bidId)
      .eq('rfq_marketplace_id', rfqId)
      .maybeSingle()

    if (bidError || !bid) {
      console.error('[rfq-bid-payment] Bid not found:', bidError)
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
    }

    // Verify bid is in pending status
    if (bid.status !== 'pending') {
      return NextResponse.json(
        { error: `Bid cannot be accepted in status: ${bid.status}` },
        { status: 400 }
      )
    }

    // Check if payment already exists for this bid
    const { data: existingPayment } = await supabase
      .from('repair_payments')
      .select('id, escrow_status')
      .eq('quote_id', bidId) // Using quote_id field to store bid_id
      .maybeSingle()

    if (existingPayment && existingPayment.escrow_status === 'held') {
      return NextResponse.json(
        { error: 'Payment already processed for this bid' },
        { status: 400 }
      )
    }

    // Calculate platform fee (assuming 12% for now - should come from fee rules)
    const platformFeePercent = 12.0
    const platformFeeAmount = (bid.quote_amount * platformFeePercent) / 100
    const providerAmount = bid.quote_amount - platformFeeAmount

    // Create Stripe checkout session
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Workshop Repair Bid Payment',
              description: `Payment for ${rfq.title} - ${bid.workshop_name}`,
            },
            unit_amount: Math.round(bid.quote_amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${routeFor.rfqBidPaymentSuccess(rfqId, bidId)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${routeFor.rfqBidPaymentCancel(rfqId, bidId)}`,
      client_reference_id: bidId,
      metadata: {
        type: 'rfq_bid_payment',
        rfq_id: rfqId,
        bid_id: bidId,
        customer_id: user.id,
        workshop_id: bid.workshop_id,
        platform_fee: platformFeeAmount.toString(),
        provider_amount: providerAmount.toString(),
      },
      customer_email: user.email || undefined,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    // Log payment initiation (for audit trail)
    console.log(
      `[rfq-bid-payment] Checkout session created for RFQ ${rfqId}, bid ${bidId}, session ${session.id}`
    )

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('[rfq-bid-payment] Error creating checkout:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
