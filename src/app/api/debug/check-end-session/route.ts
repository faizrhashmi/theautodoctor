import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canTransition } from '@/lib/sessionFsm'
import type { SessionStatus } from '@/types/session'

/**
 * DEBUG ENDPOINT: Check why session end is failing
 *
 * Usage: GET /api/debug/check-end-session?sessionId=xxx&userId=yyy
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
      usage: '/api/debug/check-end-session?sessionId=xxx&userId=yyy'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    userId,
    checks: [],
  }

  try {
    // Check 1: Does session exist?
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.checks.push({
      check: 1,
      name: 'Session exists',
      success: !!session,
      session_status: session?.status,
      mechanic_id: session?.mechanic_id,
      customer_user_id: session?.customer_user_id,
      started_at: session?.started_at,
      error: sessionError?.message
    })

    if (!session) {
      return NextResponse.json(results, { status: 404 })
    }

    // Check 2: Is user a participant?
    if (userId) {
      const { data: participant, error: participantError } = await supabaseAdmin
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .maybeSingle()

      results.checks.push({
        check: 2,
        name: 'User is participant',
        success: !!participant,
        role: participant?.role,
        error: participantError?.message
      })
    }

    // Check 3: Can we transition to completed?
    const currentStatus = session.status as SessionStatus
    const canComplete = canTransition(currentStatus, 'completed')
    const canCancel = canTransition(currentStatus, 'cancelled')

    results.checks.push({
      check: 3,
      name: 'FSM state transition',
      current_status: currentStatus,
      can_transition_to_completed: canComplete,
      can_transition_to_cancelled: canCancel,
      will_use: canComplete ? 'completed' : canCancel ? 'cancelled' : 'BLOCKED'
    })

    // Check 4: Get all participants
    const { data: allParticipants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    results.checks.push({
      check: 4,
      name: 'All participants',
      participants: allParticipants
    })

    // Check 5: Session metadata
    results.checks.push({
      check: 5,
      name: 'Session details',
      type: session.type,
      plan: session.plan,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      metadata: session.metadata
    })

    results.summary = {
      can_end: canComplete || canCancel,
      blocking_issue: !canComplete && !canCancel ? 'FSM blocks transition' : null
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[check-end-session] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      checks: results.checks,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
