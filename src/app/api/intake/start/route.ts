import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ redirect: `/start?trial=1&intake_id=${encodeURIComponent(intakeId!)}` });
  }
  return NextResponse.json({ redirect: `/api/checkout?plan=${encodeURIComponent(plan)}&intake_id=${encodeURIComponent(intakeId!)}` });
}
