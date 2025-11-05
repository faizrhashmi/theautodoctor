import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { AccessToken } from 'livekit-server-sdk'

/**
 * POST /api/mechanic/sessions/:sessionId/join
 * Join a session as mechanic - returns LiveKit token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // 🔒 SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    const { sessionId } = params

    console.log(`[Mechanic Session Join] Mechanic ${mechanic.id} joining session ${sessionId}`)

    // Parse device fingerprint from request body
    const body = await request.json().catch(() => ({}))
    const { device_fingerprint } = body

    if (!device_fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint required' },
        { status: 400 }
      )
    }

    // Verify mechanic is assigned to this session
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('session_assignments')
      .select(`
        id,
        mechanic_id,
        status,
        sessions (
          id,
          status,
          type,
          room_id,
          customer_user_id
        )
      `)
      .eq('session_id', sessionId)
      .eq('mechanic_id', mechanic.id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or access denied' },
        { status: 404 }
      )
    }

    if (assignment.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Assignment not accepted yet' },
        { status: 400 }
      )
    }

    const session = assignment.sessions as any

    // Check session status
    if (!['waiting', 'live'].includes(session.status)) {
      return NextResponse.json(
        { error: `Cannot join ${session.status} session` },
        { status: 400 }
      )
    }

    // Log session event
    await supabaseAdmin.from('session_events').insert({
      session_id: sessionId,
      event_type: 'joined',
      mechanic_id: mechanic.id,
      metadata: {
        device_fingerprint,
        role: 'mechanic',
        timestamp: new Date().toISOString()
      }
    })

    // Register device
    const { error: deviceError } = await supabaseAdmin
      .from('session_devices')
      .upsert({
        session_id: sessionId,
        user_id: mechanic.userId, // Use mechanic's user_id for device tracking
        device_fingerprint,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id,device_fingerprint'
      })

    if (deviceError) {
      console.error('[Mechanic Session Join] Device registration error:', deviceError)
    }

    // Upsert session participant
    await supabaseAdmin
      .from('session_participants')
      .upsert({
        session_id: sessionId,
        user_id: mechanic.userId,
        role: 'mechanic',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })

    // Update session status to 'live' if it's not already
    if (session.status === 'waiting') {
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'live', started_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Log status change
      await supabaseAdmin.from('session_events').insert({
        session_id: sessionId,
        event_type: 'started',
        mechanic_id: mechanic.id,
        metadata: {
          previous_status: 'waiting',
          new_status: 'live'
        }
      })

      // Notify customer that mechanic joined
      if (session.customer_user_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: session.customer_user_id,
          type: 'session_started',
          payload: {
            session_id: sessionId,
            mechanic_id: mechanic.id
          }
        })
      }
    }

    // Generate LiveKit token
    const roomName = session.room_id || `session-${sessionId}`
    const participantName = mechanic.email
    const participantIdentity = mechanic.userId

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: participantIdentity,
        name: participantName,
        metadata: JSON.stringify({ role: 'mechanic', mechanicId: mechanic.id })
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
    console.error('[Mechanic Session Join] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
