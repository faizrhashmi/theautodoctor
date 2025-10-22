import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword, makeSessionToken } from '@/lib/auth';

function bad(msg: string, status = 400) { return NextResponse.json({ error: msg }, { status }); }

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);
  const { email, password } = await req.json().catch(() => ({}));

  console.log('[MECHANIC LOGIN] Attempt for email:', email);

  if (!email || !password) return bad('Email and password are required');

  const { data: mech, error } = await supabaseAdmin.from('mechanics')
    .select('id, password_hash')
    .eq('email', email).maybeSingle();

  console.log('[MECHANIC LOGIN] Database query result:', { found: !!mech, error: error?.message });

  if (error) return bad(error.message, 500);
  if (!mech) {
    console.log('[MECHANIC LOGIN] No mechanic found for email:', email);
    return bad('Invalid credentials', 401);
  }

  const ok = verifyPassword(password, mech.password_hash);
  console.log('[MECHANIC LOGIN] Password verification:', ok);

  if (!ok) return bad('Invalid credentials', 401);

  const token = makeSessionToken();
  const expires = new Date(Date.now() + 1000*60*60*24*30);
  const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
    mechanic_id: mech.id,
    token,
    expires_at: expires.toISOString(),
  });

  console.log('[MECHANIC LOGIN] Session creation:', { success: !sErr, error: sErr?.message });

  if (sErr) return bad(sErr.message, 500);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60*60*24*30,
  });

  console.log('[MECHANIC LOGIN] Success! Cookie set for mechanic:', mech.id);

  return res;
}
