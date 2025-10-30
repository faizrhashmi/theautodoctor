import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * GET /api/debug/test-end-session?sessionId=xxx
 *
 * Test the complete end session flow to diagnose where it's failing
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    tests: [],
  }

  try {
    // Test 1: Check auth
    const supabaseAsUser = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: { user }, error: authError } = await supabaseAsUser.auth.getUser()

    results.tests.push({
      test: 1,
      name: 'Authentication Check',
      success: !!user,
      user_id: user?.id || null,
      user_email: user?.email || null,
      error: authError?.message || null,
    })

    if (!user) {
      results.error = 'Not authenticated - login first'
      return NextResponse.json(results, { status: 401 })
    }

    // Test 2: Find session in sessions table
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.tests.push({
      test: 2,
      name: 'Find Session in sessions table',
      success: !!sessionsData,
      found: !!sessionsData,
      error: sessionsError?.message || null,
      data: sessionsData || null,
    })

    // Test 3: Find session in diagnostic_sessions table
    const { data: diagnosticData, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.tests.push({
      test: 3,
      name: 'Find Session in diagnostic_sessions table',
      success: !!diagnosticData,
      found: !!diagnosticData,
      error: diagnosticError?.message || null,
      data: diagnosticData || null,
    })

    const session = sessionsData || diagnosticData
    const sessionTable = sessionsData ? 'sessions' : diagnosticData ? 'diagnostic_sessions' : null

    if (!session) {
      results.error = 'Session not found in either table'
      return NextResponse.json(results, { status: 404 })
    }

    results.sessionFound = {
      table: sessionTable,
      session: session,
    }

    // Test 4: Check if user is authorized (participant)
    // For sessions table
    let isAuthorized = false
    let userRole = null

    if (sessionsData) {
      if (sessionsData.customer_user_id === user.id) {
        isAuthorized = true
        userRole = 'customer'
      } else if (sessionsData.mechanic_id) {
        // Check if user is the mechanic
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (mechanic && mechanic.id === sessionsData.mechanic_id) {
          isAuthorized = true
          userRole = 'mechanic'
        }
      }
    }

    // For diagnostic_sessions table
    if (diagnosticData) {
      if (diagnosticData.customer_id === user.id) {
        isAuthorized = true
        userRole = 'customer'
      } else if (diagnosticData.mechanic_id) {
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (mechanic && mechanic.id === diagnosticData.mechanic_id) {
          isAuthorized = true
          userRole = 'mechanic'
        }
      }
    }

    results.tests.push({
      test: 4,
      name: 'Authorization Check',
      success: isAuthorized,
      isAuthorized,
      userRole,
      user_id: user.id,
      session_customer_id: session.customer_id || session.customer_user_id,
      session_mechanic_id: session.mechanic_id,
    })

    if (!isAuthorized) {
      results.error = 'User is not authorized to end this session'
      results.recommendation = 'User must be either the customer or mechanic in this session'
      return NextResponse.json(results, { status: 403 })
    }

    // Test 5: Check session status
    results.tests.push({
      test: 5,
      name: 'Session Status Check',
      status: session.status,
      can_be_ended: ['pending', 'waiting', 'active', 'in_progress'].includes(session.status),
      already_ended: ['completed', 'cancelled'].includes(session.status),
    })

    // Summary
    results.summary = {
      session_id: sessionId,
      found_in_table: sessionTable,
      user_authenticated: true,
      user_authorized: isAuthorized,
      user_role: userRole,
      session_status: session.status,
      can_end_session: isAuthorized && !['completed', 'cancelled'].includes(session.status),
    }

    if (results.summary.can_end_session) {
      results.message = '✅ All checks passed - session can be ended'
      results.next_step = `POST to /api/sessions/${sessionId}/end`
    } else if (session.status === 'completed' || session.status === 'cancelled') {
      results.message = '⚠️  Session is already ended'
    } else {
      results.message = '❌ Cannot end session - check failed tests above'
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[test-end-session] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      tests: results.tests,
    }, { status: 500 })
  }
}
