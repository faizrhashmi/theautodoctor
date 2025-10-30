import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

/**
 * SECURITY: Verify that the authenticated user has permission to join the requested room
 * Returns userId if authorized, null otherwise
 */
async function verifyRoomAccess(req: NextRequest, room: string): Promise<{ userId: string | null; userType: 'customer' | 'mechanic' | null }> {
  // Try Supabase auth first (customers/admins)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (user && !authError) {
    // Verify user is a participant in the session (room)
    if (!supabaseAdmin) {
      console.error('[LiveKit Token] Supabase admin not configured')
      return { userId: null, userType: null }
    }

    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id')
      .eq('id', room)
      .maybeSingle()

    // Check if user is customer for this session
    if (session && session.customer_user_id === user.id) {
      console.log('[LiveKit Token] Customer authorized for room:', room)
      return { userId: user.id, userType: 'customer' }
    }

    // Check if user is mechanic for this session (Supabase Auth)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'mechanic') {
      // Get mechanic profile
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      // Verify mechanic is assigned to this session
      if (mechanic && session && session.mechanic_id === mechanic.id) {
        console.log('[LiveKit Token] Mechanic authorized for room:', room, '(user_id:', user.id, ')')
        return { userId: user.id, userType: 'mechanic' }
      }
    }

    // Check if admin (admins can join any room for monitoring)
    if (profile?.role === 'admin') {
      console.log('[LiveKit Token] Admin authorized for room:', room)
      return { userId: user.id, userType: 'customer' } // Treat admin as customer for LiveKit
    }
  }

  console.warn('[LiveKit Token] Unauthorized access attempt for room:', room)
  return { userId: null, userType: null }
}

async function buildTokenResponse(req: NextRequest, room: string | null, identity: string | null, metadata?: string | null) {
  if (!room || !identity) {
    console.error('Missing room or identity:', { room, identity })
    return NextResponse.json({ error: 'room and identity are required' }, { status: 400 })
  }

  if (missingEnv()) {
    return NextResponse.json({ error: 'LiveKit server credentials are not configured' }, { status: 500 })
  }

  // SECURITY: Verify user has permission to join this room
  const { userId, userType } = await verifyRoomAccess(req, room)

  if (!userId) {
    console.error('[LiveKit Token] Unauthorized: No valid authentication or room access')
    return NextResponse.json({ error: 'Unauthorized: You must be authenticated and a participant in this session' }, { status: 401 })
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

    console.log(`[LiveKit Token] Token generated for ${userType}:`, userId, 'room:', room)

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
  return buildTokenResponse(req, payload.room ?? null, payload.identity ?? null, payload.metadata ?? null)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  const identity = searchParams.get('identity')
  const metadata = searchParams.get('metadata')
  return buildTokenResponse(req, room, identity, metadata)
}
