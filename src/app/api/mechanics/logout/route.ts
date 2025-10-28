import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  // Get the token from the cookie
  const token = req.cookies.get('aad_mech')?.value;

  // ✅ Delete session from database (Priority 6: Database Session Cleanup)
  if (token && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('mechanic_sessions')
        .delete()
        .eq('token', token);

      if (error) {
        console.error('[MECHANIC LOGOUT] Failed to delete session from database:', error);
        // Continue with logout even if database cleanup fails
      } else {
        console.log('[MECHANIC LOGOUT] Session deleted from database');
      }
    } catch (err) {
      console.error('[MECHANIC LOGOUT] Exception during database cleanup:', err);
      // Continue with logout even if exception occurs
    }
  }

  // Clear both access and refresh token cookies
  const res = NextResponse.json({ ok: true });

  // Clear access token
  res.cookies.set('aad_mech', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  // Clear refresh token
  res.cookies.set('aad_mech_refresh', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return res;
}
