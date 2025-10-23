import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database, Json } from '@/types/supabase';

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
  } = body || {};

  // Strict server-side validation mirrors the client
  if (!name || !email || !phone || !city) return bad('Missing required contact fields');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[0-9+()\-\s]{7,}$/i.test(phone);
  if (!emailOk) return bad('Invalid email');
  if (!phoneOk) return bad('Invalid phone');

  const hasYMM = !!(year && make && model);
  if (!(vin && String(vin).trim().length === 17) && !hasYMM) {
    return bad('Provide VIN (17) or full Year/Make/Model');
  }
  if (vin && String(vin).trim().length > 0 && String(vin).trim().length !== 17) {
    return bad('VIN must be 17 characters');
  }
  if (!concern || String(concern).trim().length < 10) {
    return bad('Describe the issue (at least 10 characters)');
  }

  // Persist intake
  let intakeId: string | null = null;
  if (supabaseAdmin) {
    const payload: any = {
      plan, name, email, phone, city,
      vin, year, make, model, odometer, plate, concern,
      files, // array of storage paths
    };
    const { data, error } = await supabaseAdmin.from('intakes').insert(payload).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    intakeId = data.id;
  } else {
    intakeId = `local-${Date.now()}`;
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
          .in('status', ['pending', 'waiting', 'live', 'scheduled']) // Block ALL non-completed sessions
          .gte('created_at', twentyFourHoursAgo) // Check last 24 hours
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
      };

      const freeSessionKey = `free_${intakeId}_${randomUUID()}`

      const { data: sessionInsert, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .insert({
          type: 'chat',
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

        // Create session_request to notify mechanics
        try {
          // Get customer name from profile
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          const customerName = profile?.full_name || email || 'Customer';

          // Cancel any old pending requests for this customer
          await supabaseAdmin
            .from('session_requests')
            .update({ status: 'cancelled' })
            .eq('customer_id', user.id)
            .eq('status', 'pending')
            .is('mechanic_id', null);

          // Create the session request
          const { data: newRequest } = await supabaseAdmin
            .from('session_requests')
            .insert({
              customer_id: user.id,
              session_type: 'chat',
              plan_code: plan,
              status: 'pending',
              customer_name: customerName,
              customer_email: email || null,
            })
            .select()
            .single();

          // Broadcast to notify mechanics in real-time
          if (newRequest) {
            const { broadcastSessionRequest } = await import('@/lib/sessionRequests');
            void broadcastSessionRequest('new_request', { request: newRequest });
          }
        } catch (error) {
          console.error('[intake] Error creating session request:', error);
          // Don't fail the whole flow if this fails
        }
      }
    }

    // Redirect to waiver signing page instead of thank-you
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
