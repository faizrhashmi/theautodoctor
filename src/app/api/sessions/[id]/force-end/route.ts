import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { SessionStatus } from '@/types/session'

/**
 * POST /api/sessions/:id/force-end
 *
 * Force-ends a session without auth checks or payout processing.
 * This is a failsafe endpoint for when normal end session fails.
 *
 * Use cases:
 * - Session stuck in waiting/live state
 * - Auth issues preventing normal end
 * - Emergency session termination
 *
 * NO AUTH REQUIRED - This is intentional for emergency use
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  console.log(`[FORCE-END] Attempting to force-end session ${sessionId}`)

  try {
    // Check both tables for the session
    let session: any = null
    let sessionTable: 'sessions' | 'diagnostic_sessions' | null = null

    const { data: sessionsData } = await supabaseAdmin
      .from('sessions')
      .select('id, status, type, started_at, mechanic_id, customer_user_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionsData) {
      session = sessionsData
      sessionTable = 'sessions'
    } else {
      const { data: diagnosticData } = await supabaseAdmin
        .from('diagnostic_sessions')
        .select('id, status, session_type as type, started_at, mechanic_id, customer_id as customer_user_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (diagnosticData) {
        session = diagnosticData
        sessionTable = 'diagnostic_sessions'
      }
    }

    if (!session || !sessionTable) {
      return NextResponse.json(
        { error: 'Session not found in either table' },
        { status: 404 }
      )
    }

    // Calculate duration if session was started
    const now = new Date().toISOString()
    let durationMinutes = null

    if (session.started_at) {
      const start = new Date(session.started_at).getTime()
      const end = new Date(now).getTime()
      durationMinutes = Math.max(1, Math.round((end - start) / 60000))
    }

    console.log(`[FORCE-END] Session ${sessionId} found in ${sessionTable}`, {
      currentStatus: session.status,
      started_at: session.started_at,
      durationMinutes,
    })

    // Force update to completed status
    const updateData = {
      status: 'completed' as SessionStatus,
      ended_at: now,
      ...(durationMinutes && { duration_minutes: durationMinutes }),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from(sessionTable)
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('[FORCE-END] Failed to update session:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to force-end session',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    console.log(`[FORCE-END] ✅ Successfully force-ended session ${sessionId}`)

    return NextResponse.json({
      success: true,
      message: 'Session force-ended successfully',
      session: {
        id: updated.id,
        previousStatus: session.status,
        newStatus: updated.status,
        ended_at: updated.ended_at,
        duration_minutes: durationMinutes,
      },
      warning: 'This was a force-end. No payouts were processed.',
    })
  } catch (error: any) {
    console.error('[FORCE-END] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
