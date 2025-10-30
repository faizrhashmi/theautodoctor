import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT: Check session and session_request status
 *
 * Usage: GET /api/debug/check-session-request?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
      usage: '/api/debug/check-session-request?sessionId=xxx'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    checks: [],
  }

  try {
    // Check 1: Look for session in sessions table
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.checks.push({
      table: 'sessions',
      found: !!sessionData,
      data: sessionData,
      error: sessionError?.message,
    })

    // Check 2: Look for session in diagnostic_sessions table
    const { data: diagnosticData, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.checks.push({
      table: 'diagnostic_sessions',
      found: !!diagnosticData,
      data: diagnosticData,
      error: diagnosticError?.message,
    })

    // Check 3: Look for session_request that might have created this session
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle()

    results.checks.push({
      table: 'session_requests',
      found: !!requestData,
      data: requestData,
      error: requestError?.message,
    })

    // Check 4: Look for ANY pending session_requests from the customer
    let customerId = sessionData?.customer_user_id || diagnosticData?.customer_id

    if (customerId) {
      const { data: customerRequests, error: customerRequestsError } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)

      results.checks.push({
        table: 'session_requests (customer)',
        customer_id: customerId,
        found: !!customerRequests && customerRequests.length > 0,
        count: customerRequests?.length || 0,
        data: customerRequests,
        error: customerRequestsError?.message,
      })
    }

    // Check 5: Look for ALL pending session_requests (mechanics should see these)
    const { data: allPendingRequests, error: allPendingError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    results.checks.push({
      table: 'session_requests (all pending)',
      found: !!allPendingRequests && allPendingRequests.length > 0,
      count: allPendingRequests?.length || 0,
      data: allPendingRequests,
      error: allPendingError?.message,
    })

    // Summary
    results.summary = {
      session_exists: !!sessionData || !!diagnosticData,
      session_table: sessionData ? 'sessions' : diagnosticData ? 'diagnostic_sessions' : null,
      has_session_request: !!requestData,
      pending_requests_count: allPendingRequests?.length || 0,
      customer_id: customerId,
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[check-session-request] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      checks: results.checks,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
