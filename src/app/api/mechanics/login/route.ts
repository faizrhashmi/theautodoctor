import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword, makeSessionToken } from '@/lib/auth';

function bad(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return bad('Email and password are required');

  const { data: mech, error } = await supabaseAdmin.from('mechanics')
    .select('id, password_hash')
    .eq('email', email).maybeSingle();

  if (error) return bad(error.message, 500);
  if (!mech) return bad('Invalid credentials', 401);
  const ok = verifyPassword(password, mech.password_hash);
  if (!ok) return bad('Invalid credentials', 401);

  const token = makeSessionToken();
  const expires = new Date(Date.now() + 1000*60*60*24*30);
  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: expires.toISOString(),
  });
  if (sErr) return bad(sErr.message, 500);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30,
  });
  return res;
}
