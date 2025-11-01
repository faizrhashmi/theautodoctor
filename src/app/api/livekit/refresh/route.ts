import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { generateLiveKitToken } from '@/lib/livekit';

/**
 * P0-2 FIX: Token refresh endpoint
 *
 * Allows clients to refresh their LiveKit token before expiration (T-10m)
 * to maintain continuous connectivity without disconnection.
 *
 * Security: Validates user still has access to the room before issuing new token.
 */

export async function POST(req: NextRequest) {
  try {
    // Auth check: require authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[LIVEKIT-REFRESH] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { room, identity } = body;

    if (!room || !identity) {
      return NextResponse.json({
        error: 'Missing required fields: room and identity',
      }, { status: 400 });
    }

    // Validate user still has access to this room
    const { data: roomMapping, error: roomError } = await supabaseAdmin
      .from('livekit_rooms')
      .select('*, sessions(*)')
      .eq('room_name', room)
      .eq('user_id', user.id)
      .maybeSingle();

    if (roomError) {
      console.error('[LIVEKIT-REFRESH] Database error:', roomError);
      return NextResponse.json({ error: 'Failed to validate access' }, { status: 500 });
    }

    if (!roomMapping) {
      console.warn(`[LIVEKIT-REFRESH] User ${user.id} attempted to refresh token for unauthorized room: ${room}`);
      return NextResponse.json({
        error: 'Access denied: You do not have permission to access this room',
      }, { status: 403 });
    }

    // Check if session is still active
    if (!roomMapping.sessions) {
      console.error('[LIVEKIT-REFRESH] Session not found for room:', room);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = roomMapping.sessions;

    // Optional: Check session status (allow refresh even if session ended for graceful disconnect)
    // if (session.status === 'ended') {
    //   return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    // }

    // Generate new token with fresh TTL
    const { token, serverUrl } = await generateLiveKitToken({
      room: room,
      identity: identity,
    });

    // Update last_refreshed timestamp
    await supabaseAdmin
      .from('livekit_rooms')
      .update({
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('room_name', room)
      .eq('user_id', user.id);

    console.log(`[LIVEKIT-REFRESH] Token refreshed for user ${user.id} in room ${room}`);

    return NextResponse.json({
      success: true,
      token: token,
      serverUrl: serverUrl,
      expiresIn: 3600, // 60 minutes in seconds
    });

  } catch (error) {
    console.error('[LIVEKIT-REFRESH] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
