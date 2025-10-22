import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/sessions/:id/start
 * Marks a session as truly started when both participants are in the chat room
 * Sets started_at timestamp and updates status to 'live'
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    // Fetch current session
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, started_at, mechanic_id, customer_user_id')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only start if session is in 'waiting' status and not already started
    if (session.status !== 'waiting') {
      return NextResponse.json({
        message: 'Session already started or not in waiting state',
        status: session.status
      })
    }

    if (session.started_at) {
      return NextResponse.json({
        message: 'Session already has started_at timestamp',
        started_at: session.started_at
      })
    }

    // Verify both participants exist
    if (!session.mechanic_id || !session.customer_user_id) {
      return NextResponse.json({
        error: 'Both mechanic and customer must be assigned'
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update session to mark as started
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'live',
        started_at: now,
        updated_at: now,
      })
      .eq('id', sessionId)
      .eq('status', 'waiting') // Only update if still waiting
      .select()
      .single()

    if (updateError) {
      console.error('[start-session] Failed to start session:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[start-session] Session ${sessionId} marked as started at ${now}`)

    return NextResponse.json({
      success: true,
      session: {
        id: updated.id,
        status: updated.status,
        started_at: updated.started_at,
      },
    })
  } catch (error: any) {
    console.error('[start-session] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
