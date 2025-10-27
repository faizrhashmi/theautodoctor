import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Manually fix session with missing mechanic_id
 * POST /api/debug/fix-session
 * Body: { sessionId: "xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Get the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    // Find the accepted request for this session
    const { data: request, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('parent_session_id', sessionId)
      .eq('status', 'accepted')
      .not('mechanic_id', 'is', null)
      .maybeSingle()

    if (requestError) {
      return NextResponse.json({
        error: 'Error finding request',
        details: requestError.message
      }, { status: 500 })
    }

    if (!request) {
      return NextResponse.json({
        error: 'No accepted request found for this session',
        hint: 'Session may not have been accepted by a mechanic yet'
      }, { status: 404 })
    }

    // Update the session with the mechanic_id from the request
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        mechanic_id: request.mechanic_id,
        status: 'waiting'
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update session',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session fixed successfully',
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        mechanic_id: updatedSession.mechanic_id,
        customer_user_id: updatedSession.customer_user_id
      },
      request: {
        id: request.id,
        mechanic_id: request.mechanic_id,
        status: request.status
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
