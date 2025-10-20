import type Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { type PlanKey, PRICING } from '@/config/pricing'
import { fulfillCheckout } from '@/lib/fulfillment'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 })
  }

  const rawBody = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const plan = (session.metadata?.plan ?? '') as PlanKey

    if (!plan || !PRICING[plan]) {
      return NextResponse.json({ error: 'Unknown plan in session metadata' }, { status: 400 })
    }

    try {
      await fulfillCheckout(plan, {
        stripeSessionId: session.id,
        intakeId: session.metadata?.intake_id ?? session.client_reference_id ?? null,
        supabaseUserId: typeof session.metadata?.supabase_user_id === 'string' && session.metadata?.supabase_user_id
          ? session.metadata.supabase_user_id
          : null,
        customerEmail:
          session.customer_details?.email ??
          (typeof session.metadata?.customer_email === 'string' ? session.metadata.customer_email : null),
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
        slotId: typeof session.metadata?.slot_id === 'string' ? session.metadata.slot_id : null,
      })
    } catch (error: any) {
      console.error('[stripe:webhook] fulfillment error', error)
      return NextResponse.json({ error: error?.message ?? 'Checkout fulfillment failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
