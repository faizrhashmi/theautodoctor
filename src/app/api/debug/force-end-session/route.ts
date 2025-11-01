import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Force end a session
 *
 * Usage: GET /api/debug/force-end-session?sessionId=xxx
 *
 * This bypasses all validation and FSM checks to force a session to end.
 * Use this to clear lingering sessions that are preventing users from creating new requests.
 */
async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
      usage: '/api/debug/force-end-session?sessionId=xxx'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    steps: [],
  }

  try {
    const now = new Date().toISOString()

    // Step 1: Try to find and end session in 'sessions' table
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, started_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionsData) {
      results.steps.push({
        step: 1,
        action: 'Found session in sessions table',
        data: sessionsData,
      })

      // Calculate duration
      const startedAt = new Date(sessionsData.started_at || now)
      const endedAt = new Date(now)
      const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))

      // Force update to completed
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: now,
          duration_minutes: durationMinutes,
          updated_at: now,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (updateError) {
        results.steps.push({
          step: 2,
          action: 'Failed to update sessions table',
          error: updateError.message,
        })
      } else {
        results.steps.push({
          step: 2,
          action: 'Successfully ended session in sessions table',
          data: updated,
        })
        results.success = true
        results.table = 'sessions'
        results.message = '✅ Session force-ended successfully'
        return NextResponse.json(results)
      }
    }

    // Step 2: Try to find and end session in 'diagnostic_sessions' table
    const { data: diagnosticData, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, status, started_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (diagnosticData) {
      results.steps.push({
        step: 3,
        action: 'Found session in diagnostic_sessions table',
        data: diagnosticData,
      })

      // Calculate duration
      const startedAt = new Date(diagnosticData.started_at || now)
      const endedAt = new Date(now)
      const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))

      // Force update to completed
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('diagnostic_sessions')
        .update({
          status: 'completed',
          ended_at: now,
          duration_minutes: durationMinutes,
          updated_at: now,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (updateError) {
        results.steps.push({
          step: 4,
          action: 'Failed to update diagnostic_sessions table',
          error: updateError.message,
        })
      } else {
        results.steps.push({
          step: 4,
          action: 'Successfully ended session in diagnostic_sessions table',
          data: updated,
        })
        results.success = true
        results.table = 'diagnostic_sessions'
        results.message = '✅ Session force-ended successfully'
        return NextResponse.json(results)
      }
    }

    // Step 3: Session not found in either table
    results.steps.push({
      step: 5,
      action: 'Session not found in any table',
      checked: ['sessions', 'diagnostic_sessions'],
    })

    results.success = false
    results.message = '❌ Session not found'
    return NextResponse.json(results, { status: 404 })

  } catch (error: any) {
    console.error('[force-end-session] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
