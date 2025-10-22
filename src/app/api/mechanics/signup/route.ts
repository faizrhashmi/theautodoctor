import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashPassword, makeSessionToken } from '@/lib/auth';

function bad(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);
  const { name, email, phone, password } = await req.json().catch(() => ({}));

  console.log('[MECHANIC SIGNUP] Attempt for email:', email);

  if (!email || !password) return bad('Email and password are required');

  const password_hash = hashPassword(password);

  // create or error on duplicate email
  const { data: mech, error } = await supabaseAdmin.from('mechanics')
    .insert({ name, email, phone, password_hash })
    .select('id').single();

  console.log('[MECHANIC SIGNUP] Database insert result:', { success: !!mech, error: error?.message, code: error?.code });

  if (error) {
    if (error.code === '23505') return bad('Email already registered', 409);
    return bad(error.message, 500);
  }

  // create session
  const token = makeSessionToken();
  const expires = new Date(Date.now() + 1000*60*60*24*30); // 30 days
  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: expires.toISOString(),
  });

  console.log('[MECHANIC SIGNUP] Session creation:', { success: !sErr, error: sErr?.message });

  if (sErr) return bad(sErr.message, 500);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30,
  });

  console.log('[MECHANIC SIGNUP] Success! Mechanic created:', mech.id);

  return res;
}
