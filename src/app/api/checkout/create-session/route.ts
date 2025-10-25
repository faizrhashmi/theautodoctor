import { NextRequest, NextResponse } from 'next/server';
import { PLAN_ALIASES, type PlanKey, PRICING } from '@/config/pricing';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const planParam = req.nextUrl.searchParams.get('plan') ?? '';
  const intakeId = req.nextUrl.searchParams.get('intake_id') ?? undefined;
  const slotId = req.nextUrl.searchParams.get('slot_id') ?? undefined;
  const workshopId = req.nextUrl.searchParams.get('workshop_id') ?? undefined;
  const routingType = req.nextUrl.searchParams.get('routing_type') ?? undefined;
  const key = (PLAN_ALIASES[planParam] ?? planParam) as PlanKey;

  if (!planParam || !PRICING[key]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const cfg = PRICING[key];
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!user) {
    const redirect = new URL('/start', origin);
    redirect.searchParams.set('plan', key);
    redirect.searchParams.set('redirect', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(redirect.toString(), 303);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: cfg.stripePriceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${key}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: intakeId,
      metadata: {
        plan: key,
        supabase_user_id: user.id,
        customer_email: user.email ?? '',
        ...(intakeId ? { intake_id: intakeId } : {}),
        ...(slotId ? { slot_id: slotId } : {}),
        ...(workshopId ? { workshop_id: workshopId } : {}),
        ...(routingType ? { routing_type: routingType } : {}),
      },
      customer_email: user.email ?? undefined,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Unable to create checkout session' }, { status: 502 });
    }

    return NextResponse.redirect(session.url, 303);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Unable to create checkout session' }, { status: 500 });
  }
}
