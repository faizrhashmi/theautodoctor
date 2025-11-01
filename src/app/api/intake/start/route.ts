import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database, Json } from '@/types/supabase';
import { trackInteraction } from '@/lib/crm';
import { PRICING, type PlanKey } from '@/config/pricing';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON');
  }

  const {
    plan = 'trial',
    name, email, phone, city,
    vin = '', year = '', make = '', model = '',
    odometer = '', plate = '',
    concern,
    files = [],
    urgent = false,
    vehicle_id = null, // Vehicle ID from vehicles table (optional)
    use_credits = false, // Flag to use subscription credits
    is_specialist = false, // Flag for brand specialist
  } = body || {};

  // Strict server-side validation mirrors the client
  if (!name || !email || !phone || !city) return bad('Missing required contact fields');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[0-9+()\-\s]{7,}$/i.test(phone);
  if (!emailOk) return bad('Invalid email');
  if (!phoneOk) return bad('Invalid phone');

  // For urgent sessions, vehicle info is optional - can be provided during session
  if (!urgent) {
    const hasYMM = !!(year && make && model);
    if (!(vin && String(vin).trim().length === 17) && !hasYMM) {
      return bad('Provide VIN (17) or full Year/Make/Model');
    }
  }

  // Validate VIN length if provided (both urgent and non-urgent)
  if (vin && String(vin).trim().length > 0 && String(vin).trim().length !== 17) {
    return bad('VIN must be 17 characters');
  }

  // Concern validation - shorter minimum for urgent sessions
  const minConcernLength = urgent ? 5 : 10;
  if (!concern || String(concern).trim().length < minConcernLength) {
    return bad(`Describe the issue (at least ${minConcernLength} characters)`);
  }

  // Persist intake
  let intakeId: string | null = null;
  if (supabaseAdmin) {
    const payload: any = {
      plan, name, email, phone, city,
      vin, year, make, model, odometer, plate, concern,
      files, // array of storage paths
      urgent, // flag for priority handling
      vehicle_id: vehicle_id || null, // Link to vehicles table
    };
    const { data, error } = await supabaseAdmin.from('intakes').insert(payload).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    intakeId = data.id;

    // Track intake submission in CRM
    if (user?.id && intakeId) {
      void trackInteraction({
        customerId: user.id,
        interactionType: 'intake_submitted',
        metadata: {
          intake_id: intakeId,
          plan,
          vehicle: vin ? `VIN: ${vin}` : `${year} ${make} ${model}`,
          has_files: files.length > 0,
          file_count: files.length,
        },
      });
    }
  } else {
    intakeId = `local-${Date.now()}`;
  }

  // Handle credit-based sessions
  if (use_credits && user?.id) {
    if (!supabaseAdmin || !intakeId) {
      return bad('Server error: Admin client unavailable');
    }

    // Determine session type from plan
    let sessionType: 'chat' | 'video' | 'diagnostic' = 'chat';
    const planConfig = PRICING[plan as PlanKey];
    const fulfillment = planConfig?.fulfillment || 'chat';
    if (fulfillment === 'chat' || fulfillment === 'video' || fulfillment === 'diagnostic') {
      sessionType = fulfillment;
    }

    // Get credit cost from pricing table
    const { data: creditPricing, error: pricingError } = await supabaseAdmin
      .from('credit_pricing')
      .select('credit_cost')
      .eq('session_type', sessionType)
      .eq('is_specialist', is_specialist)
      .or('effective_until.is.null,effective_until.gt.' + new Date().toISOString())
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (pricingError || !creditPricing) {
      return bad('Unable to determine credit cost for this session');
    }

    const creditCost = creditPricing.credit_cost;

    // Check for existing active/pending sessions
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: activeSessions, error: checkError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, type, created_at')
      .eq('customer_user_id', user.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!checkError && activeSessions && activeSessions.length > 0) {
      const activeSession = activeSessions[0]!;
      return NextResponse.json({
        error: 'You already have an active or pending session. Please complete or cancel your existing session before starting a new one.',
        activeSessionId: activeSession.id,
        activeSessionType: activeSession.type,
        activeSessionStatus: activeSession.status,
      }, { status: 409 });
    }

    // Create session first
    const metadata: Record<string, Json> = {
      intake_id: intakeId,
      source: 'intake',
      plan,
      urgent,
      payment_method: 'credits',
      is_specialist,
      credit_cost: creditCost,
    };

    const { data: sessionInsert, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        type: sessionType,
        status: 'pending',
        plan,
        intake_id: intakeId,
        customer_user_id: user.id,
        metadata,
        stripe_session_id: null, // No Stripe payment for credit sessions
      })
      .select('id')
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    const sessionId = sessionInsert.id;

    // Deduct credits using database function
    const { error: deductError } = await supabaseAdmin.rpc('deduct_session_credits', {
      p_customer_id: user.id,
      p_session_id: sessionId,
      p_session_type: sessionType,
      p_is_specialist: is_specialist,
      p_credit_cost: creditCost,
    });

    if (deductError) {
      // Delete the session if credit deduction failed
      await supabaseAdmin.from('sessions').delete().eq('id', sessionId);

      return NextResponse.json({
        error: deductError.message.includes('Insufficient credits')
          ? 'Insufficient credits. Please add more credits or choose a pay-as-you-go option.'
          : 'Failed to deduct credits. Please try again.',
      }, { status: 400 });
    }

    // Add customer as participant
    await supabaseAdmin
      .from('session_participants')
      .upsert(
        { session_id: sessionId, user_id: user.id, role: 'customer' },
        { onConflict: 'session_id,user_id' },
      );

    console.log(`[INTAKE] Created credit-based session ${sessionId} for intake ${intakeId}, deducted ${creditCost} credits`);

    // Redirect to waiver signing page
    const waiverUrl = new URL('/intake/waiver', req.nextUrl.origin);
    waiverUrl.searchParams.set('plan', plan);
    waiverUrl.searchParams.set('intake_id', intakeId);
    waiverUrl.searchParams.set('session', sessionId);
    waiverUrl.searchParams.set('credits_used', 'true');

    return NextResponse.json({ redirect: `${waiverUrl.pathname}${waiverUrl.search}` });
  }

  if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
    let sessionId: string | null = null;

    if (supabaseAdmin && intakeId) {
      // Check for existing active/pending sessions - Only ONE session allowed at a time!
      if (user?.id) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: activeSessions, error: checkError } = await supabaseAdmin
          .from('sessions')
          .select('id, status, type, created_at')
          .eq('customer_user_id', user.id)
          .in('status', ['pending', 'waiting', 'live', 'scheduled'])
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!checkError && activeSessions && activeSessions.length > 0) {
          const activeSession = activeSessions[0]!;
          return NextResponse.json({
            error: 'You already have an active or pending session. Please complete or cancel your existing session before starting a new one.',
            activeSessionId: activeSession.id,
            activeSessionType: activeSession.type,
            activeSessionStatus: activeSession.status,
          }, { status: 409 });
        }
      }

      const metadata: Record<string, Json> = {
        intake_id: intakeId,
        source: 'intake',
        plan,
        urgent,
      };

      const freeSessionKey = `free_${intakeId}_${randomUUID()}`;

      // Determine session type from plan
      let sessionType: 'chat' | 'video' | 'diagnostic' = 'chat';
      const planConfig = PRICING[plan as PlanKey];
      const fulfillment = planConfig?.fulfillment || 'chat';
      if (fulfillment === 'chat' || fulfillment === 'video' || fulfillment === 'diagnostic') {
        sessionType = fulfillment;
      }

      const { data: sessionInsert, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .insert({
          type: sessionType,
          status: 'pending',
          plan,
          intake_id: intakeId,
          customer_user_id: user?.id ?? null,
          metadata,
          stripe_session_id: freeSessionKey,
        })
        .select('id')
        .single();

      if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 });
      }

      sessionId = sessionInsert.id;
      console.log(`[INTAKE] Created session ${sessionId} for intake ${intakeId}`);

      if (user?.id) {
        const { error: participantError } = await supabaseAdmin
          .from('session_participants')
          .upsert(
            { session_id: sessionId, user_id: user.id, role: 'customer' },
            { onConflict: 'session_id,user_id' },
          );

        if (participantError) {
          return NextResponse.json({ error: participantError.message }, { status: 500 });
        }
      }
    }

    // Redirect to waiver signing page
    const waiverUrl = new URL('/intake/waiver', req.nextUrl.origin);
    waiverUrl.searchParams.set('plan', plan);
    if (intakeId) waiverUrl.searchParams.set('intake_id', intakeId);
    if (sessionId) waiverUrl.searchParams.set('session', sessionId);

    return NextResponse.json({ redirect: `${waiverUrl.pathname}${waiverUrl.search}` });
  }

  // Paid plans also redirect to waiver first, then waiver will redirect to checkout
  const waiverUrl = new URL('/intake/waiver', req.nextUrl.origin);
  waiverUrl.searchParams.set('plan', plan);
  if (intakeId) waiverUrl.searchParams.set('intake_id', intakeId);

  return NextResponse.json({
    redirect: `${waiverUrl.pathname}${waiverUrl.search}`,
  });
}
