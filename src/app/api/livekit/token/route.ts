import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

interface TokenRequestPayload {
  room?: string | null
  identity?: string | null
  metadata?: string | null
}

function missingEnv() {
  const hasKey = !!process.env.LIVEKIT_API_KEY
  const hasSecret = !!process.env.LIVEKIT_API_SECRET

  if (!hasKey || !hasSecret) {
    console.error('LiveKit configuration check:', {
      hasKey,
      hasSecret,
    })
    return true
  }
  return false
}

async function buildTokenResponse(room: string | null, identity: string | null, metadata?: string | null) {
  if (!room || !identity) {
    console.error('Missing room or identity:', { room, identity })
    return NextResponse.json({ error: 'room and identity are required' }, { status: 400 })
  }

  if (missingEnv()) {
    return NextResponse.json({ error: 'LiveKit server credentials are not configured' }, { status: 500 })
  }

  try {
    const accessToken = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
      identity,
      metadata: metadata ?? undefined,
    })

    accessToken.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await accessToken.toJwt()

    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || 'wss://myautodoctorca-oe6r6oqr.livekit.cloud'

    return NextResponse.json({ token, room, serverUrl })
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    return NextResponse.json({
      error: 'Failed to generate access token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const payload: TokenRequestPayload = await req.json().catch(() => ({}))
  return buildTokenResponse(payload.room ?? null, payload.identity ?? null, payload.metadata ?? null)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  const identity = searchParams.get('identity')
  const metadata = searchParams.get('metadata')
  return buildTokenResponse(room, identity, metadata)
}
