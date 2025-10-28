import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { makeSessionToken } from '@/lib/auth';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * Token Refresh Endpoint
 *
 * Priority 5: Implement Token Refresh for Mechanics
 * - Access tokens expire after 2 hours
 * - Refresh tokens are valid for 30 days
 * - This endpoint exchanges a valid refresh token for a new access token
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return bad('Supabase not configured on server', 500);
  }

  // Get the refresh token from cookie
  const refreshToken = req.cookies.get('aad_mech_refresh')?.value;

  if (!refreshToken) {
    return bad('No refresh token provided', 401);
  }

  console.log('[MECHANIC REFRESH] Attempting token refresh');

  // Find the session by refresh token
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('*')
    .eq('refresh_token', refreshToken)
    .maybeSingle();

  if (sessionError || !session) {
    console.log('[MECHANIC REFRESH] Invalid refresh token');
    return bad('Invalid refresh token', 401);
  }

  // Check if refresh token has expired
  const refreshExpiresAt = new Date(session.refresh_expires_at);
  if (refreshExpiresAt < new Date()) {
    console.log('[MECHANIC REFRESH] Refresh token expired');

    // Clean up expired session
    await supabaseAdmin
      .from('mechanic_sessions')
      .delete()
      .eq('id', session.id);

    return bad('Refresh token expired', 401);
  }

  // Generate new access token
  const newAccessToken = makeSessionToken();
  const newAccessExpires = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours

  // Update session with new access token
  const { error: updateError } = await supabaseAdmin
    .from('mechanic_sessions')
    .update({
      token: newAccessToken,
      expires_at: newAccessExpires.toISOString(),
      last_activity: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (updateError) {
    console.error('[MECHANIC REFRESH] Failed to update session:', updateError);
    return bad('Failed to refresh token', 500);
  }

  console.log('[MECHANIC REFRESH] Token refreshed successfully for mechanic:', session.mechanic_id);

  // Set new access token cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('aad_mech', newAccessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  });

  return res;
}
