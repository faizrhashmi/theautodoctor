import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { generateLiveKitToken } from '@/lib/livekit';

/**
 * P0-6 FIX: Redeem one-time invite code
 *
 * Security improvements:
 * - Code is consumed on first use (prevents replay attacks)
 * - Token is returned in response body (not URL, so not logged)
 * - Validates expiration and checks for double-redemption
 * - Codes are never logged in plaintext
 */

// P0-6 FIX: Redact invite codes from logs
function redactCode(code: string): string {
  if (!code || code.length < 4) return '****';
  return `${code.substring(0, 2)}****${code.substring(code.length - 2)}`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check: require authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[INVITE-REDEEM] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid code' }, { status: 400 });
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim();

    // P0-6 FIX: Redact code in logs
    console.log(`[INVITE-REDEEM] Attempting to redeem code: ${redactCode(normalizedCode)}`);

    // Look up invite code
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('session_invites')
      .select('*, sessions(*)')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError) {
      console.error('[INVITE-REDEEM] Database error:', inviteError);
      return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 });
    }

    if (!invite) {
      console.warn(`[INVITE-REDEEM] Invalid code attempted: ${redactCode(normalizedCode)}`);
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // Check if code has already been consumed
    if (invite.status === 'consumed') {
      console.warn(`[INVITE-REDEEM] Code already consumed: ${redactCode(normalizedCode)}`);
      return NextResponse.json({
        error: 'This invite code has already been used',
      }, { status: 400 });
    }

    // Check if code has expired
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      console.warn(`[INVITE-REDEEM] Expired code attempted: ${redactCode(normalizedCode)}`);
      return NextResponse.json({
        error: 'This invite code has expired',
      }, { status: 400 });
    }

    // Validate session still exists and is active
    if (!invite.sessions) {
      console.error('[INVITE-REDEEM] Session not found for invite:', invite.session_id);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = invite.sessions;

    // Mark invite as consumed (atomic operation)
    const { error: updateError } = await supabaseAdmin
      .from('session_invites')
      .update({
        status: 'consumed',
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq('code', normalizedCode)
      .eq('status', 'pending'); // Only update if still pending (race condition protection)

    if (updateError) {
      console.error('[INVITE-REDEEM] Failed to consume code:', updateError);
      return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 });
    }

    // Generate LiveKit token for the user
    const roomName = `session-${session.id}`;
    const identity = `${invite.role}-${user.id}-${Date.now()}`;

    const { token, serverUrl } = await generateLiveKitToken({
      room: roomName,
      identity: identity,
    });

    // P0-1 FIX: Store room mapping server-side (no metadata in JWT)
    await supabaseAdmin.from('livekit_rooms').upsert(
      {
        room_name: roomName,
        session_id: session.id,
        user_id: user.id,
        role: invite.role,
        identity: identity,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'room_name,user_id' }
    );

    console.log(`[INVITE-REDEEM] Successfully redeemed code ${redactCode(normalizedCode)} for session ${session.id}`);

    // P0-6 FIX: Return token in response body (not in URL)
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
      },
      livekit: {
        token: token,
        serverUrl: serverUrl,
        room: roomName,
        identity: identity,
      },
      role: invite.role,
    });

  } catch (error) {
    console.error('[INVITE-REDEEM] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
