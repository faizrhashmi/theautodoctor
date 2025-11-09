import { NextRequest, NextResponse } from 'next/server';
import { PLAN_ALIASES, type PlanKey, PRICING } from '@/config/pricing';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const planParam = req.nextUrl.searchParams.get('plan') ?? '';
  const intakeId = req.nextUrl.searchParams.get('intake_id') ?? undefined;
  const slotId = req.nextUrl.searchParams.get('slot_id') ?? undefined;
  const workshopId = req.nextUrl.searchParams.get('workshop_id') ?? undefined;
  const routingType = req.nextUrl.searchParams.get('routing_type') ?? undefined;

  if (!planParam) {
    return NextResponse.json({ error: 'Plan parameter required' }, { status: 400 });
  }

  // Normalize plan slug (handle aliases)
  const planSlug = PLAN_ALIASES[planParam] || planParam;

  // ✅ FETCH PLAN FROM DATABASE (Dynamic Pricing)
  const { data: planData, error: planError } = await supabaseAdmin
    .from('service_plans')
    .select('slug, name, price, stripe_price_id, duration_minutes, plan_type')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .eq('plan_type', 'payg')  // Only PAYG for now
    .single()

  if (planError || !planData) {
    console.error('[Checkout] Plan not found in database:', planSlug, planError)

    // Fallback to hardcoded PRICING config for backward compatibility
    const key = planSlug as PlanKey
    if (!PRICING[key]) {
      return NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 400 });
    }

    console.warn('[Checkout] Using fallback hardcoded pricing for:', key)
    const cfg = PRICING[key];
    var stripePriceId = cfg.stripePriceId;
    var planName = cfg.name;
  } else {
    // ✅ USE DATABASE PRICING
    if (!planData.stripe_price_id) {
      return NextResponse.json(
        { error: 'Plan is not configured for payments. Contact support.' },
        { status: 400 }
      );
    }

    var stripePriceId = planData.stripe_price_id;
    var planName = planData.name;
  }

  const supabase = getSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  // Smart origin detection for all environments:
  // - Production: Use NEXT_PUBLIC_APP_URL (must be set to actual domain)
  // - Dev with proxy/tunnel: Use NEXT_PUBLIC_APP_URL (e.g., ngrok URL)
  // - Dev without proxy: Use request origin (auto port detection)
  const origin = (() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL
    const requestOrigin = req.nextUrl.origin

    // Production: Use NEXT_PUBLIC_APP_URL if set to a real domain
    // This prevents using internal server addresses (0.0.0.0, localhost, etc.)
    if (process.env.NODE_ENV === 'production') {
      // If env URL is set to a real domain (not localhost/0.0.0.0), use it
      if (envUrl &&
          !envUrl.includes('localhost') &&
          !envUrl.includes('127.0.0.1') &&
          !envUrl.includes('0.0.0.0')) {
        return envUrl
      }
      // Fallback to request origin (but log warning as this shouldn't happen)
      console.warn('[Checkout] Production env missing valid NEXT_PUBLIC_APP_URL, using request origin:', requestOrigin)
      return requestOrigin
    }

    // Dev: If NEXT_PUBLIC_APP_URL is set to non-localhost (proxy/tunnel), use it
    if (envUrl &&
        !envUrl.includes('localhost') &&
        !envUrl.includes('127.0.0.1') &&
        !envUrl.includes('0.0.0.0')) {
      return envUrl
    }

    // Dev: Default to request origin for automatic port detection
    return requestOrigin
  })();

  if (!user) {
    const redirect = new URL('/start', origin);
    redirect.searchParams.set('plan', key);
    redirect.searchParams.set('redirect', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(redirect.toString(), 303);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: stripePriceId, quantity: 1 }],  // ✅ Dynamic from database
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planSlug}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: intakeId,
      metadata: {
        plan: planSlug,
        plan_name: planName,  // Store human-readable name
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
