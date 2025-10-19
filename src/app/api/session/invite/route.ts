import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session || (session.payment_status !== 'paid' && session.status !== 'complete')) {
    return NextResponse.json({ error: 'Session not paid or not found' }, { status: 404 });
  }

  const room = `aad-${sessionId}`;
  const identity = `mech-${sessionId}-${Date.now()}`;

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit keys not set' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
  const token = await at.toJwt();

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const inviteUrl = `${origin}/video?token=${encodeURIComponent(token)}&room=${encodeURIComponent(room)}`;

  return NextResponse.json({ inviteUrl, room, role: 'mechanic' });
}
