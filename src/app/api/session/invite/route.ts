import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  // Check if this is a database session ID
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, type, status')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Generate LiveKit token for mechanic
  const room = `session-${sessionId}`;
  const identity = `mechanic-${Date.now()}`;

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit keys not set' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    metadata: JSON.stringify({ role: 'mechanic', sessionId }),
  });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });
  const token = await at.toJwt();

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://myautodoctorca-oe6r6oqr.livekit.cloud';

  // Create invite URL based on session type
  const sessionRoute = session.type === 'chat' ? 'chat' : session.type === 'diagnostic' ? 'diagnostic' : 'video';
  const inviteUrl = `${origin}/${sessionRoute}/${sessionId}?mechanic_token=${encodeURIComponent(token)}`;

  return NextResponse.json({ inviteUrl, room, role: 'mechanic' });
}
