import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'
import { fulfillCheckout } from '@/lib/fulfillment'
import { PRICING } from '@/config/pricing'

export async function GET(req: NextRequest) {
  const stripeSessionId = req.nextUrl.searchParams.get('stripe_session_id')
  if (!stripeSessionId) {
    return NextResponse.json({ error: 'Missing stripe_session_id' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('id, type, plan')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    // If the session isn't yet in our DB, try to fetch the Checkout Session from Stripe
    // and run fulfillment (this mirrors what the webhook would do). This makes the
    // redirect-after-checkout flow work reliably in environments where webhooks may
    // be delayed or not configured (eg. local dev).
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId as string)
      const plan = (stripeSession?.metadata?.plan ?? '') as keyof typeof PRICING

      if (!plan || !PRICING[plan]) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // Call the same fulfillment logic as the webhook. This will create the session
      // record and participants when needed and return the session id and type.
      const result = await fulfillCheckout(plan as any, {
        stripeSessionId: stripeSessionId as string,
        intakeId: stripeSession?.metadata?.intake_id ?? stripeSession?.client_reference_id ?? null,
        supabaseUserId:
          typeof stripeSession?.metadata?.supabase_user_id === 'string' && stripeSession?.metadata?.supabase_user_id
            ? stripeSession?.metadata?.supabase_user_id
            : null,
        customerEmail:
          stripeSession?.customer_details?.email ??
          (typeof stripeSession?.metadata?.customer_email === 'string' ? stripeSession?.metadata?.customer_email : null),
        amountTotal: (stripeSession as any).amount_total ?? null,
        currency: (stripeSession as any).currency ?? null,
        slotId: typeof stripeSession?.metadata?.slot_id === 'string' ? stripeSession?.metadata?.slot_id : null,
      })

      return NextResponse.json({ sessionId: result.sessionId, type: result.type, plan })
    } catch (err: any) {
      console.error('[resolve-by-stripe] fallback error', err)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
  }

  return NextResponse.json({
    sessionId: data.id,
    type: data.type,
    plan: data.plan,
  })
}
