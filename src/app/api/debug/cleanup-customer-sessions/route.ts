import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Cleanup all pending/stuck sessions and requests for a customer
 *
 * Usage: GET /api/debug/cleanup-customer-sessions?email=cust1@test.com
 */
async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({
      error: 'Missing email parameter',
      usage: '/api/debug/cleanup-customer-sessions?email=cust1@test.com'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    email,
    steps: [],
  }

  try {
    // Step 1: Find customer by email
    const { data: users, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .maybeSingle()

    if (userError || !users) {
      // Try auth.users table
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      const user = authUser?.users?.find(u => u.email === email)

      if (!user) {
        results.steps.push({
          step: 1,
          action: 'Find customer',
          error: 'Customer not found'
        })
        return NextResponse.json(results, { status: 404 })
      }

      results.customer_id = user.id
      results.steps.push({
        step: 1,
        action: 'Find customer',
        success: true,
        customer_id: user.id,
        email: user.email
      })
    } else {
      results.customer_id = users.id
      results.steps.push({
        step: 1,
        action: 'Find customer',
        success: true,
        customer_id: users.id,
        email: users.email,
        name: users.full_name
      })
    }

    const customerId = results.customer_id

    // Step 2: Find all pending/active sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, type, created_at')
      .eq('customer_user_id', customerId)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .order('created_at', { ascending: false })

    results.steps.push({
      step: 2,
      action: 'Find active sessions',
      success: !sessionsError,
      count: sessions?.length || 0,
      sessions: sessions,
      error: sessionsError?.message
    })

    // Step 3: Delete or complete all pending sessions
    if (sessions && sessions.length > 0) {
      const now = new Date().toISOString()

      for (const session of sessions) {
        // Calculate duration
        const startedAt = new Date(session.created_at)
        const endedAt = new Date(now)
        const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))

        // Force complete the session
        const { error: updateError } = await supabaseAdmin
          .from('sessions')
          .update({
            status: 'completed',
            ended_at: now,
            duration_minutes: durationMinutes,
            updated_at: now,
          })
          .eq('id', session.id)

        results.steps.push({
          step: 3,
          action: `Complete session ${session.id}`,
          success: !updateError,
          session_id: session.id,
          old_status: session.status,
          new_status: 'completed',
          error: updateError?.message
        })
      }
    }

    // Step 4: Find all pending session_requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('id, status, session_type, created_at')
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    results.steps.push({
      step: 4,
      action: 'Find pending session_requests',
      success: !requestsError,
      count: requests?.length || 0,
      requests: requests,
      error: requestsError?.message
    })

    // Step 5: Cancel all pending session_requests
    if (requests && requests.length > 0) {
      const { data: cancelled, error: cancelError } = await supabaseAdmin
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('customer_id', customerId)
        .eq('status', 'pending')
        .select()

      results.steps.push({
        step: 5,
        action: 'Cancel pending session_requests',
        success: !cancelError,
        cancelled_count: cancelled?.length || 0,
        error: cancelError?.message
      })
    }

    // Step 6: Check diagnostic_sessions table too
    const { data: diagnosticSessions, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, status, session_type, created_at')
      .eq('customer_id', customerId)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .order('created_at', { ascending: false })

    results.steps.push({
      step: 6,
      action: 'Find active diagnostic_sessions',
      success: !diagnosticError,
      count: diagnosticSessions?.length || 0,
      sessions: diagnosticSessions,
      error: diagnosticError?.message
    })

    // Step 7: Complete diagnostic sessions
    if (diagnosticSessions && diagnosticSessions.length > 0) {
      const now = new Date().toISOString()

      for (const session of diagnosticSessions) {
        const startedAt = new Date(session.created_at)
        const endedAt = new Date(now)
        const durationMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))

        const { error: updateError } = await supabaseAdmin
          .from('diagnostic_sessions')
          .update({
            status: 'completed',
            ended_at: now,
            duration_minutes: durationMinutes,
            updated_at: now,
          })
          .eq('id', session.id)

        results.steps.push({
          step: 7,
          action: `Complete diagnostic_session ${session.id}`,
          success: !updateError,
          session_id: session.id,
          old_status: session.status,
          new_status: 'completed',
          error: updateError?.message
        })
      }
    }

    results.success = true
    results.message = '✅ Cleanup completed!'
    results.summary = {
      sessions_completed: sessions?.length || 0,
      diagnostic_sessions_completed: diagnosticSessions?.length || 0,
      requests_cancelled: requests?.length || 0,
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[cleanup-customer-sessions] Error:', error)
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
