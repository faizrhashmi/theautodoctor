import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { AccessToken } from 'livekit-server-sdk'

/**
 * POST /api/customer/sessions/:sessionId/join
 * Join a session - returns LiveKit token for connecting to the room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // 🔒 SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    const { sessionId } = params

    console.log(`[Customer Session Join] ${customer.email} joining session ${sessionId}`)

    // Parse device fingerprint from request body
    const body = await request.json().catch(() => ({}))
    const { device_fingerprint } = body

    if (!device_fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint required' },
        { status: 400 }
      )
    }

    // Verify session belongs to customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status, type, room_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.customer_user_id !== customer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check session status
    if (!['pending', 'waiting', 'live'].includes(session.status)) {
      return NextResponse.json(
        { error: `Cannot join ${session.status} session` },
        { status: 400 }
      )
    }

    // Log session event
    await supabaseAdmin.from('session_events').insert({
      session_id: sessionId,
      event_type: 'joined',
      user_id: customer.id,
      metadata: {
        device_fingerprint,
        timestamp: new Date().toISOString()
      }
    })

    // Register device
    const { error: deviceError } = await supabaseAdmin
      .from('session_devices')
      .upsert({
        session_id: sessionId,
        user_id: customer.id,
        device_fingerprint,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id,device_fingerprint'
      })

    if (deviceError) {
      console.error('[Customer Session Join] Device registration error:', deviceError)
      // Don't fail the join request - device tracking is best-effort
    }

    // Upsert session participant
    await supabaseAdmin
      .from('session_participants')
      .upsert({
        session_id: sessionId,
        user_id: customer.id,
        role: 'customer',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })

    // Update session status to 'live' if it's the first join
    if (session.status === 'waiting' || session.status === 'pending') {
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Log status change
      await supabaseAdmin.from('session_events').insert({
        session_id: sessionId,
        event_type: 'started',
        user_id: customer.id,
        metadata: {
          previous_status: session.status,
          new_status: 'live'
        }
      })
    }

    // Generate LiveKit token
    const roomName = session.room_id || `session-${sessionId}`
    const participantName = customer.email
    const participantIdentity = customer.id

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: participantIdentity,
        name: participantName
      }
    )

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    })

    const token = await at.toJwt()

    return NextResponse.json({
      success: true,
      token,
      roomName,
      sessionId,
      sessionType: session.type
    })

  } catch (error) {
    console.error('[Customer Session Join] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
