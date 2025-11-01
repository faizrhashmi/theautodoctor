import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Check if a session exists in different tables
 *
 * GET /api/debug/check-session?id=7634b27b-9d36-4c64-9e97-419c9fa153fd
 */
async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  const results: any = {
    sessionId,
    timestamp: new Date().toISOString(),
    checks: {}
  }

  try {
    // Check sessions table
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.checks.sessions_table = {
      found: !!session,
      data: session,
      error: sessionError?.message
    }

    // Check diagnostic_sessions table
    const { data: diagnosticSession, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.checks.diagnostic_sessions_table = {
      found: !!diagnosticSession,
      data: diagnosticSession,
      error: diagnosticError?.message
    }

    // Check session_requests table
    const { data: sessionRequests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('parent_session_id', sessionId)

    results.checks.session_requests = {
      found: (sessionRequests?.length || 0) > 0,
      count: sessionRequests?.length || 0,
      data: sessionRequests,
      error: requestsError?.message
    }

    // Check session_participants
    if (session || diagnosticSession) {
      const { data: participants, error: participantsError } = await supabaseAdmin
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)

      results.checks.session_participants = {
        found: (participants?.length || 0) > 0,
        count: participants?.length || 0,
        data: participants,
        error: participantsError?.message
      }
    }

    // Analysis
    results.analysis = {
      existsInSessions: !!session,
      existsInDiagnosticSessions: !!diagnosticSession,
      tableConfusion: !!session && !!diagnosticSession,
      missing: !session && !diagnosticSession,
      canBeEnded: !!session,
      recommendation: !session && !!diagnosticSession
        ? 'Session is in diagnostic_sessions table but end endpoint looks in sessions table!'
        : !session && !diagnosticSession
        ? 'Session does not exist in any table - orphaned reference'
        : session && diagnosticSession
        ? 'Session exists in BOTH tables - data inconsistency!'
        : 'Session exists in sessions table and can be ended normally'
    }

    return NextResponse.json(results)

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      sessionId
    }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
