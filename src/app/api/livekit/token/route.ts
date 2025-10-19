import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const identity = url.searchParams.get("identity") || "guest";
  const roomName = url.searchParams.get("room") || `aad-${Date.now()}`;

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit env not set" }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  const token = await at.toJwt();

  return NextResponse.json({ token, room: roomName });
}
