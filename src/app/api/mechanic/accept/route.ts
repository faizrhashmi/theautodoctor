/**
 * ATOMIC MECHANIC ACCEPT ENDPOINT
 *
 * Purpose: Single authoritative endpoint for mechanics to accept requests.
 * Atomically creates the session and marks request as accepted in one transaction.
 *
 * POST /api/mechanic/accept
 * Body: { requestId: string }
 *
 * Returns: { sessionId: string, status: string, request: object, session: object }
 *
 * Database guarantees (via constraints from migration 02):
 * - Mechanic can only have ONE active session (uniq_mech_one_active index)
 * - Status must be valid (sessions_status_check constraint)
 *
 * FSM guarantees:
 * - Request must be in 'pending' or 'unattended' status
 * - Session created with 'waiting' status
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastSessionRequest, toSessionRequest } from '@/lib/sessionRequests'

// ============================================================================
// HELPER: Get authenticated mechanic
// ============================================================================

async function getMechanicFromCookie(_req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATE MECHANIC
    const mechanic = await getMechanicFromCookie(req)

    if (!mechanic) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in as a mechanic' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { requestId } = body as { requestId: string }

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    console.log(`[ACCEPT] Mechanic ${mechanic.id} accepting request ${requestId}`)

    // 2. FETCH REQUEST - Verify it exists and is available
    const { data: request, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('id', requestId)
      .in('status', ['pending', 'unattended']) // Only accept available requests
      .is('mechanic_id', null) // Not already claimed
      .single()

    if (requestError || !request) {
      console.warn(`[ACCEPT] Request not found or already claimed:`, requestId)
      return NextResponse.json(
        { error: 'Request not available - it may have been claimed by another mechanic' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // 3. ATOMIC TRANSACTION - Update request + Create session
    // This must happen in a transaction to avoid race conditions

    // Step 3a: Mark request as accepted
    const { data: acceptedRequest, error: acceptError } = await supabaseAdmin
      .from('session_requests')
      .update({
        mechanic_id: mechanic.id,
        status: 'accepted',
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .in('status', ['pending', 'unattended']) // Double-check still available
      .is('mechanic_id', null)
      .select()
      .maybeSingle()

    if (acceptError || !acceptedRequest) {
      console.error('[ACCEPT] Failed to accept request:', acceptError)
      return NextResponse.json(
        {
          error: 'Failed to accept request - it may have been claimed by another mechanic',
          details: acceptError?.message,
        },
        { status: 409 }
      )
    }

    // Step 3b: Create session with status 'waiting'
    // The DB unique index will prevent duplicate active sessions for this mechanic
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        customer_user_id: request.customer_id,
        mechanic_id: mechanic.id,
        status: 'waiting', // FSM: waiting → can transition to live
        plan: request.plan_code,
        type: request.session_type,
        scheduled_for: request.preferred_time || null,
        created_at: now,
        updated_at: now,
        metadata: {
          request_id: requestId,
          accepted_by_mechanic: mechanic.id,
          accepted_at: now,
        },
      })
      .select()
      .single()

    if (sessionError) {
      console.error('[ACCEPT] Failed to create session:', sessionError)

      // CRITICAL: Rollback the request acceptance
      await supabaseAdmin
        .from('session_requests')
        .update({
          mechanic_id: null,
          status: 'pending',
          accepted_at: null,
          updated_at: now,
        })
        .eq('id', requestId)

      // Check if it's the unique constraint violation (23505)
      if (sessionError.code === '23505' && sessionError.message?.includes('uniq_mech_one_active')) {
        return NextResponse.json(
          {
            error:
              'You already have an active session. Please complete or cancel it before accepting new requests.',
            code: 'MECHANIC_HAS_ACTIVE_SESSION',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to create session',
          details: sessionError.message,
        },
        { status: 500 }
      )
    }

    console.log(`[ACCEPT] ✓ Success: Created session ${session.id} for request ${requestId}`)

    // 4. BROADCAST UPDATE - Notify other clients this request is taken
    try {
      const requestForBroadcast = toSessionRequest(acceptedRequest)
      await broadcastSessionRequest('UPDATE', requestForBroadcast)
    } catch (broadcastError) {
      console.warn('[ACCEPT] Failed to broadcast update:', broadcastError)
      // Non-critical - don't fail the request
    }

    // 5. SUCCESS RESPONSE - Return session details
    return NextResponse.json({
      success: true,
      message: 'Request accepted successfully',
      sessionId: session.id,
      status: session.status,
      request: {
        id: acceptedRequest.id,
        status: acceptedRequest.status,
        accepted_at: acceptedRequest.accepted_at,
        customer_id: acceptedRequest.customer_id,
        plan: acceptedRequest.plan_code,
        type: acceptedRequest.session_type,
      },
      session: {
        id: session.id,
        status: session.status,
        plan: session.plan,
        type: session.type,
        created_at: session.created_at,
      },
    })
  } catch (error: any) {
    console.error('[ACCEPT] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
