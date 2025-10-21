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
      }
    }

    const thankYouUrl = new URL('/thank-you', req.nextUrl.origin);
    thankYouUrl.searchParams.set('plan', plan);
    if (intakeId) thankYouUrl.searchParams.set('intake_id', intakeId);
    if (sessionId) {
      thankYouUrl.searchParams.set('session', sessionId);
      thankYouUrl.searchParams.set('type', 'chat');
    }

    return NextResponse.json({ redirect: `${thankYouUrl.pathname}${thankYouUrl.search}` });
  }
  return NextResponse.json({
    redirect: `/api/checkout/create-session?plan=${encodeURIComponent(plan)}&intake_id=${encodeURIComponent(intakeId!)}`,
  });
}
