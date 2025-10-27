import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Fix orphaned session (no mechanic_id, no parent_session_id link)
 * POST /api/debug/fix-orphaned-session
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

    console.log('[FIX] Session:', { id: session.id, status: session.status, mechanic_id: session.mechanic_id, customer_id: session.customer_user_id })

    // Find recent accepted requests for this customer
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('customer_id', session.customer_user_id)
      .eq('status', 'accepted')
      .not('mechanic_id', 'is', null)
      .order('accepted_at', { ascending: false })
      .limit(5)

    if (requestsError) {
      return NextResponse.json({
        error: 'Error finding requests',
        details: requestsError.message
      }, { status: 500 })
    }

    console.log('[FIX] Found', requests?.length || 0, 'accepted requests for customer')

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        error: 'No accepted requests found for this customer',
        hint: 'Customer may not have any active accepted requests'
      }, { status: 404 })
    }

    // Try to find request created around the same time as session
    const sessionTime = new Date(session.created_at).getTime()
    const closestRequest = requests.reduce((closest, req) => {
      const reqTime = new Date(req.created_at).getTime()
      const closestTime = new Date(closest.created_at).getTime()
      const reqDiff = Math.abs(reqTime - sessionTime)
      const closestDiff = Math.abs(closestTime - sessionTime)
      return reqDiff < closestDiff ? req : closest
    })

    console.log('[FIX] Using request:', { id: closestRequest.id, mechanic_id: closestRequest.mechanic_id, parent_session_id: closestRequest.parent_session_id })

    // Update the request to link to this session
    const { error: linkError } = await supabaseAdmin
      .from('session_requests')
      .update({
        parent_session_id: sessionId
      })
      .eq('id', closestRequest.id)

    if (linkError) {
      console.error('[FIX] Failed to update request parent_session_id:', linkError)
    } else {
      console.log('[FIX] Linked request to session')
    }

    // Update the session with mechanic_id
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        mechanic_id: closestRequest.mechanic_id,
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
        id: closestRequest.id,
        mechanic_id: closestRequest.mechanic_id,
        status: closestRequest.status,
        parent_session_id: sessionId
      },
      action: 'Updated session.mechanic_id and request.parent_session_id'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
