/**
 * ATOMIC MECHANIC ACCEPT ENDPOINT (FIXED)
 *
 * Purpose: Single authoritative endpoint for mechanics to accept requests.
 * Updates the existing session created by intake flow and marks request as accepted.
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
 * - Session updated to 'waiting' status (pending → waiting transition)
 *
 * CRITICAL FIX: This endpoint now UPDATES the existing session created by intake
 * instead of creating a duplicate session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { toSessionRequest } from '@/lib/sessionRequests'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'
import { requireMechanicAPI } from '@/lib/auth/guards'

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(req)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data

    const body = await req.json()
    const { requestId } = body as { requestId: string }

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    console.log(`[ACCEPT] Mechanic ${mechanic.id} accepting request ${requestId}`)

    // 2. CHECK FOR EXISTING ACTIVE SESSION
    // Prevent mechanic from accepting if they already have an active session
    const { data: existingActiveSession } = await supabaseAdmin
      .from('sessions')
      .select('id, status')
      .eq('mechanic_id', mechanic.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .maybeSingle()

    if (existingActiveSession) {
      console.warn(`[ACCEPT] Mechanic ${mechanic.id} already has active session ${existingActiveSession.id}`)
      return NextResponse.json(
        {
          error: 'You already have an active session. Please complete or cancel it before accepting new requests.',
          code: 'MECHANIC_HAS_ACTIVE_SESSION',
          activeSessionId: existingActiveSession.id,
        },
        { status: 409 }
      )
    }

    // 3. FETCH REQUEST - Verify it exists and is available
    // First check if request exists at all
    const { data: requestCheck, error: checkError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (checkError) {
      console.error('[ACCEPT] Database error checking request:', checkError)
      return NextResponse.json(
        { error: 'Database error', details: checkError.message },
        { status: 500 }
      )
    }

    if (!requestCheck) {
      console.warn(`[ACCEPT] Request not found:`, requestId)
      return NextResponse.json(
        { error: 'Request not found - it may have been deleted' },
        { status: 404 }
      )
    }

    // Check if request is claimable
    if (requestCheck.mechanic_id !== null) {
      console.warn(`[ACCEPT] Request already claimed by mechanic:`, requestCheck.mechanic_id)
      return NextResponse.json(
        {
          error: 'Request already claimed by another mechanic',
          claimedBy: requestCheck.mechanic_id
        },
        { status: 409 }
      )
    }

    if (requestCheck.status !== 'pending') {
      console.warn(`[ACCEPT] Request has invalid status:`, requestCheck.status)
      return NextResponse.json(
        {
          error: `Request cannot be accepted - status is '${requestCheck.status}'`,
          currentStatus: requestCheck.status
        },
        { status: 409 }
      )
    }

    const request = requestCheck
    console.log(`[ACCEPT] Request validation passed:`, {
      id: request.id,
      status: request.status,
      mechanic_id: request.mechanic_id
    })

    const now = new Date().toISOString()
    // Note: Actual schema uses parent_session_id, not metadata.session_id
    let existingSessionId = request.parent_session_id || null

    // FALLBACK: If parent_session_id is null, try to find the session by customer + time match
    if (!existingSessionId) {
      console.log(`[ACCEPT] parent_session_id is null, attempting fallback session lookup`)
      const { data: matchingSession } = await supabaseAdmin
        .from('sessions')
        .select('id')
        .eq('customer_user_id', request.customer_id)
        .eq('type', request.session_type)
        .in('status', ['pending', 'waiting'])
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Within 30 mins
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (matchingSession) {
        existingSessionId = matchingSession.id
        console.log(`[ACCEPT] Found matching session via fallback: ${existingSessionId}`)

        // Update the request to link it to the session for future reference
        await supabaseAdmin
          .from('session_requests')
          .update({ parent_session_id: existingSessionId })
          .eq('id', requestId)
      } else {
        console.warn(`[ACCEPT] No matching session found for request ${requestId}`)
      }
    }

    console.log(`[ACCEPT] Request linked to session:`, { existingSessionId })

    // 4. MARK REQUEST AS ACCEPTED
    console.log(`[ACCEPT] Attempting to update request ${requestId} with mechanic ${mechanic.id}`)

    const { data: acceptedRequest, error: acceptError } = await supabaseAdmin
      .from('session_requests')
      .update({
        mechanic_id: mechanic.id,
        status: 'accepted',
        accepted_at: now,
        // Note: updated_at doesn't exist in actual schema
      })
      .eq('id', requestId)
      .eq('status', 'pending') // Only accept pending requests
      .is('mechanic_id', null)
      .select()
      .maybeSingle()

    if (acceptError) {
      console.error('[ACCEPT] Database error updating request:', acceptError)
      console.error('[ACCEPT] Full error object:', JSON.stringify(acceptError, null, 2))
      console.error('[ACCEPT] Mechanic ID being used:', mechanic.id)
      console.error('[ACCEPT] Request ID being used:', requestId)
      return NextResponse.json(
        {
          error: 'Database error while accepting request',
          details: acceptError.message,
          code: acceptError.code,
          hint: acceptError.hint,
          errorDetails: acceptError.details,
          mechanicId: mechanic.id,
          requestId: requestId
        },
        { status: 500 }
      )
    }

    if (!acceptedRequest) {
      console.error('[ACCEPT] Update returned no rows - request was modified during acceptance')
      console.error('[ACCEPT] This could mean: request status changed, mechanic_id was set, or request was deleted')
      return NextResponse.json(
        {
          error: 'Request was modified by another action - please refresh and try again',
          hint: 'The request may have been accepted by another mechanic or its status changed'
        },
        { status: 409 }
      )
    }

    console.log(`[ACCEPT] Successfully marked request as accepted:`, acceptedRequest.id)

    let session

    // 5. UPDATE OR CREATE SESSION
    if (existingSessionId) {
      // PREFERRED PATH: Update the existing session created by intake
      console.log(`[ACCEPT] Updating existing session ${existingSessionId}`)

      // First, check current session state
      const { data: currentSession } = await supabaseAdmin
        .from('sessions')
        .select('id, status, mechanic_id')
        .eq('id', existingSessionId)
        .maybeSingle()

      if (!currentSession) {
        console.error(`[ACCEPT] Session ${existingSessionId} not found`)
        // Fall through to create new session
      } else if (currentSession.mechanic_id && currentSession.mechanic_id !== mechanic.id) {
        console.error(`[ACCEPT] Session already assigned to another mechanic: ${currentSession.mechanic_id}`)

        // Rollback the request acceptance
        await supabaseAdmin
          .from('session_requests')
          .update({
            mechanic_id: null,
            status: 'pending',
            accepted_at: null,
          })
          .eq('id', requestId)

        return NextResponse.json(
          {
            error: 'This session was just claimed by another mechanic',
            code: 'SESSION_ALREADY_CLAIMED',
          },
          { status: 409 }
        )
      } else {
        // Update session - allow both 'pending' and 'waiting' status
        const { data: updatedSession, error: updateError } = await supabaseAdmin
          .from('sessions')
          .update({
            mechanic_id: mechanic.id,
            status: 'waiting', // Ensure status is 'waiting'
          })
          .eq('id', existingSessionId)
          .in('status', ['pending', 'waiting']) // Allow both states
          .select()
          .single()

        if (updateError) {
          console.error('[ACCEPT] Failed to update existing session:', updateError)

          // Rollback the request acceptance
          await supabaseAdmin
            .from('session_requests')
            .update({
              mechanic_id: null,
              status: 'pending',
              accepted_at: null,
            })
            .eq('id', requestId)

          return NextResponse.json(
            {
              error: 'Failed to update session',
              details: updateError.message,
            },
            { status: 500 }
          )
        }

        session = updatedSession
        console.log(`[ACCEPT] ✓ Success: Updated session ${session.id} with mechanic_id ${mechanic.id}`)
      }
    }

    // CRITICAL: Add participants to session_participants table
    if (session) {
      console.log(`[ACCEPT] Adding participants to session ${session.id}`)

      // Add customer as participant
      const { error: customerParticipantError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          { session_id: session.id, user_id: request.customer_id, role: 'customer' },
          { onConflict: 'session_id,user_id' }
        )

      if (customerParticipantError) {
        console.error('[ACCEPT] Failed to add customer as participant:', customerParticipantError)
      } else {
        console.log('[ACCEPT] ✓ Added customer as participant')
      }

      // Add mechanic as participant
      const { error: mechanicParticipantError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          { session_id: session.id, user_id: mechanic.userId, role: 'mechanic' },
          { onConflict: 'session_id,user_id' }
        )

      if (mechanicParticipantError) {
        console.error('[ACCEPT] Failed to add mechanic as participant:', mechanicParticipantError)
      } else {
        console.log('[ACCEPT] ✓ Added mechanic as participant')
      }
    }

    if (!session) {
      // FALLBACK PATH: Create new session (for old requests or edge cases)
      console.warn(`[ACCEPT] No existing session found, creating new session for request ${requestId}`)

      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .insert({
          customer_user_id: request.customer_id,
          mechanic_id: mechanic.id,
          status: 'waiting', // FSM: direct to waiting
          plan: request.plan_code,
          type: request.session_type,
          created_at: now,
          stripe_session_id: `manual-${requestId}`,
          // Note: scheduled_for, updated_at, metadata don't exist in actual schema
        })
        .select()
        .single()

      if (sessionError) {
        console.error('[ACCEPT] Failed to create session:', sessionError)

        // Rollback the request acceptance
        await supabaseAdmin
          .from('session_requests')
          .update({
            mechanic_id: null,
            status: 'pending',
            accepted_at: null,
          })
          .eq('id', requestId)

        return NextResponse.json(
          {
            error: 'Failed to create session',
            details: sessionError.message,
          },
          { status: 500 }
        )
      }

      session = newSession
      console.log(`[ACCEPT] ✓ Success: Created new session ${session.id} for request ${requestId}`)

      // CRITICAL: Add participants for newly created session
      console.log(`[ACCEPT] Adding participants to new session ${session.id}`)

      // Add customer as participant
      const { error: customerParticipantError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          { session_id: session.id, user_id: request.customer_id, role: 'customer' },
          { onConflict: 'session_id,user_id' }
        )

      if (customerParticipantError) {
        console.error('[ACCEPT] Failed to add customer as participant:', customerParticipantError)
      } else {
        console.log('[ACCEPT] ✓ Added customer as participant')
      }

      // Add mechanic as participant
      const { error: mechanicParticipantError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          { session_id: session.id, user_id: mechanic.userId, role: 'mechanic' },
          { onConflict: 'session_id,user_id' }
        )

      if (mechanicParticipantError) {
        console.error('[ACCEPT] Failed to add mechanic as participant:', mechanicParticipantError)
      } else {
        console.log('[ACCEPT] ✓ Added mechanic as participant')
      }
    }

    // 6. BROADCAST UPDATE - Notify other clients this request is taken
    try {
      const requestForBroadcast = toSessionRequest(acceptedRequest)
      await broadcastSessionRequest('request_accepted', { request: requestForBroadcast })
    } catch (broadcastError) {
      console.warn('[ACCEPT] Failed to broadcast update:', broadcastError)
      // Non-critical - don't fail the request
    }

    // 7. SUCCESS RESPONSE - Return session details
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
