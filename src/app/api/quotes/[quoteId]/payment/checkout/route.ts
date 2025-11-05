/**
 * Quote Payment Checkout API
 * Phase 1.3: Direct quote acceptance + Stripe
 *
 * Creates Stripe checkout session for quote payment with escrow
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'
import { routeFor } from '@/lib/routes'

export async function POST(
  req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  const { quoteId } = params

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

    // Fetch quote details with RLS check (ensures customer owns this quote)
    const { data: quote, error: quoteError } = await supabase
      .from('repair_quotes')
      .select(
        `
        id,
        customer_id,
        customer_total,
        platform_fee_amount,
        provider_receives,
        workshop_id,
        mechanic_id,
        status,
        line_items
      `
      )
      .eq('id', quoteId)
      .maybeSingle()

    if (quoteError || !quote) {
      console.error('[quote-payment] Quote not found:', quoteError)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Verify quote belongs to authenticated user
    if (quote.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify quote is in pending status
    if (quote.status !== 'pending' && quote.status !== 'viewed') {
      return NextResponse.json(
        { error: `Quote cannot be paid in status: ${quote.status}` },
        { status: 400 }
      )
    }

    // Check if payment already exists for this quote
    const { data: existingPayment } = await supabase
      .from('repair_payments')
      .select('id, escrow_status')
      .eq('quote_id', quoteId)
      .maybeSingle()

    if (existingPayment && existingPayment.escrow_status === 'held') {
      return NextResponse.json(
        { error: 'Payment already processed for this quote' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    // Smart origin detection: production uses domain, dev supports both proxy and auto port
    const origin = (() => {
      const envUrl = process.env.NEXT_PUBLIC_APP_URL
      const requestOrigin = req.nextUrl.origin
      if (process.env.NODE_ENV === 'production') return requestOrigin
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) return envUrl
      return requestOrigin
    })()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Repair Quote Payment',
              description: `Payment for repair quote ${quoteId}`,
            },
            unit_amount: Math.round(quote.customer_total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${routeFor.quotePaymentSuccess(quoteId)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${routeFor.quotePaymentCancel(quoteId)}`,
      client_reference_id: quoteId,
      metadata: {
        type: 'quote_payment',
        quote_id: quoteId,
        customer_id: user.id,
        workshop_id: quote.workshop_id || '',
        mechanic_id: quote.mechanic_id || '',
        platform_fee: quote.platform_fee_amount.toString(),
        provider_amount: quote.provider_receives.toString(),
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
      `[quote-payment] Checkout session created for quote ${quoteId}, session ${session.id}`
    )

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('[quote-payment] Error creating checkout:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
