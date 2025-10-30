/**
 * SESSION STATUS UPDATE API
 *
 * Purpose: Centralized endpoint for updating session status with FSM validation.
 * All status changes must go through this route to ensure valid state transitions.
 *
 * PATCH /api/sessions/[id]/status
 * Body: { status: SessionStatus, reason?: string }
 *
 * Returns:
 * - 200: Status updated successfully
 * - 404: Session not found
 * - 409: Invalid state transition (FSM violation)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { SessionStatus } from '@/types/session'
import { assertTransition, getTransitionMessage } from '@/lib/sessionFsm'

const supabaseAdmin = createSupabaseAdmin<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[PATCH /sessions/${sessionId}/status] ${participant.role} updating status for session ${participant.sessionId}`)

  try {
    const body = await req.json()
    const { status: newStatus, reason } = body as { status: SessionStatus; reason?: string }

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    // Fetch current session
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, started_at, ended_at, metadata')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      console.error('[STATUS UPDATE] Session not found:', sessionId, fetchError)
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const currentStatus = session.status as SessionStatus

    // FSM VALIDATION - Check if transition is valid
    try {
      assertTransition(currentStatus, newStatus)
    } catch (error: any) {
      console.warn('[STATUS UPDATE] Invalid transition:', {
        sessionId,
        from: currentStatus,
        to: newStatus,
        error: error.message,
      })

      return NextResponse.json(
        {
          error: 'Invalid state transition',
          message: getTransitionMessage(currentStatus, newStatus),
          current: currentStatus,
          requested: newStatus,
        },
        { status: 409 }
      )
    }

    // Transition is valid - update the session
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Auto-set timestamps based on status
    if (newStatus === 'live' && !session.started_at) {
      updateData.started_at = new Date().toISOString()
    }

    if (['completed', 'cancelled', 'expired'].includes(newStatus) && !session.ended_at) {
      updateData.ended_at = new Date().toISOString()
    }

    // Store reason if provided
    if (reason) {
      updateData.metadata = {
        ...(typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {}),
        status_reason: reason,
      }
    }

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('[STATUS UPDATE] Failed to update session:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session status', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[STATUS UPDATE] Success:', {
      sessionId,
      transition: `${currentStatus} -> ${newStatus}`,
      reason: reason || 'none',
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      transition: {
        from: currentStatus,
        to: newStatus,
      },
    })
  } catch (error: any) {
    console.error('[STATUS UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

