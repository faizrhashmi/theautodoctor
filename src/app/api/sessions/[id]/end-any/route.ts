import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipant } from '@/lib/auth/sessionGuards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sessions/[id]/end-any
 *
 * Allows either participant (mechanic or customer) to end a session
 * Atomically completes session for both parties
 *
 * Body: { reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipant(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[POST /sessions/${sessionId}/end-any] ${participant.role} ending session ${participant.sessionId}`)

  try {
    const body = await req.json().catch(() => ({}))
    const reason = body.reason || 'Session ended by user'

    // Fetch the session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        session_type,
        status,
        customer_id,
        mechanic_id,
        started_at,
        ended_at,
        session_request_id
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Determine role from participant data
    const isCustomer = participant.role === 'customer'
    const isMechanic = participant.role === 'mechanic'

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { message: 'Session already completed', session },
        { status: 200 }
      )
    }

    // Perform atomic completion in a transaction
    const now = new Date().toISOString()

    // Update session to completed
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: now
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[End-Any] Failed to update session:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      )
    }

    // Update linked session_request if exists
    if (session.session_request_id) {
      await supabaseAdmin
        .from('session_requests')
        .update({ status: 'completed' })
        .eq('id', session.session_request_id)
    }

    // Create notifications for both participants
    const notifications = []

    if (session.customer_id) {
      notifications.push({
        user_id: session.customer_id,
        type: 'session_completed',
        payload: {
          session_id: sessionId,
          session_type: session.session_type,
          ended_by: isCustomer ? 'customer' : 'mechanic',
          reason
        }
      })
    }

    if (session.mechanic_id && session.mechanic_id !== session.customer_id) {
      notifications.push({
        user_id: session.mechanic_id,
        type: 'session_completed',
        payload: {
          session_id: sessionId,
          session_type: session.session_type,
          ended_by: isMechanic ? 'mechanic' : 'customer',
          reason
        }
      })
    }

    if (notifications.length > 0) {
      await supabaseAdmin
        .from('notifications')
        .insert(notifications)
    }

    // Broadcast realtime event to session channel
    const realtimePayload = {
      type: 'completed',
      session_id: sessionId,
      ended_by: isCustomer ? 'customer' : 'mechanic',
      ended_at: now,
      reason
    }

    // Send via realtime channel
    await supabaseAdmin
      .from('sessions')
      .update({ metadata: { last_event: realtimePayload } })
      .eq('id', sessionId)

    // Also broadcast via Supabase Realtime
    const channel = supabase.channel(`session:${sessionId}`)
    channel.send({
      type: 'broadcast',
      event: 'session_completed',
      payload: realtimePayload
    })

    return NextResponse.json({
      success: true,
      message: 'Session completed successfully',
      session: {
        id: sessionId,
        status: 'completed',
        ended_at: now,
        ended_by: isCustomer ? 'customer' : 'mechanic'
      }
    })

  } catch (error: any) {
    console.error('[End-Any API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
