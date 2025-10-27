import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Check why active sessions aren't showing
 * GET /api/debug/check-active-sessions?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 })
    }

    const results: any = {
      sessionId,
      timestamp: new Date().toISOString(),
    }

    // Get the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    results.session = {
      id: session.id,
      status: session.status,
      type: session.type,
      plan: session.plan,
      customer_user_id: session.customer_user_id,
      mechanic_id: session.mechanic_id,
      created_at: session.created_at,
      started_at: session.started_at,
      ended_at: session.ended_at,
    }

    // Check active sessions eligibility
    const activeStatuses = ['pending', 'live', 'waiting', 'scheduled']
    const wouldAppearInActive = activeStatuses.includes(session.status)

    results.activeSessionsCheck = {
      currentStatus: session.status,
      activeStatuses: activeStatuses,
      wouldAppearInActiveList: wouldAppearInActive,
      reason: wouldAppearInActive
        ? 'Session status is in active list'
        : `Status "${session.status}" is not in active list (${activeStatuses.join(', ')})`
    }

    // Get session request
    const { data: request } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('parent_session_id', sessionId)
      .maybeSingle()

    if (request) {
      results.sessionRequest = {
        id: request.id,
        status: request.status,
        customer_id: request.customer_id,
        mechanic_id: request.mechanic_id,
        created_at: request.created_at,
        accepted_at: request.accepted_at,
      }
    } else {
      results.sessionRequest = null
      results.warnings = results.warnings || []
      results.warnings.push('No session_request found for this session')
    }

    // Check mechanic's active sessions
    if (session.mechanic_id) {
      const { data: mechanicSessions, error: mechError } = await supabaseAdmin
        .from('sessions')
        .select('id, status, type, plan, created_at')
        .eq('mechanic_id', session.mechanic_id)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false })

      if (mechError) {
        results.mechanicCheck = { error: mechError.message }
      } else {
        results.mechanicCheck = {
          mechanicId: session.mechanic_id,
          activeSessionsCount: mechanicSessions?.length || 0,
          sessions: mechanicSessions?.map(s => ({
            id: s.id,
            status: s.status,
            type: s.type,
            isCurrentSession: s.id === sessionId
          })) || [],
          wouldSeeInDashboard: mechanicSessions?.some(s => s.id === sessionId) || false
        }
      }
    } else {
      results.mechanicCheck = {
        mechanicId: null,
        message: 'No mechanic assigned to this session'
      }
    }

    // Check customer's active sessions
    if (session.customer_user_id) {
      const { data: customerSessions, error: custError } = await supabaseAdmin
        .from('sessions')
        .select('id, status, type, plan, created_at')
        .eq('customer_user_id', session.customer_user_id)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false })

      if (custError) {
        results.customerCheck = { error: custError.message }
      } else {
        results.customerCheck = {
          customerId: session.customer_user_id,
          activeSessionsCount: customerSessions?.length || 0,
          sessions: customerSessions?.map(s => ({
            id: s.id,
            status: s.status,
            type: s.type,
            isCurrentSession: s.id === sessionId
          })) || [],
          wouldSeeInDashboard: customerSessions?.some(s => s.id === sessionId) || false
        }
      }
    } else {
      results.customerCheck = {
        customerId: null,
        message: 'No customer assigned to this session'
      }
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (!wouldAppearInActive) {
      recommendations.push(`Change session status from "${session.status}" to "waiting" or "live" to appear in active sessions`)
    }

    if (!session.mechanic_id) {
      recommendations.push('Assign a mechanic to this session')
    }

    if (!session.customer_user_id) {
      recommendations.push('This session has no customer assigned')
    }

    if (wouldAppearInActive && session.mechanic_id && session.customer_user_id) {
      recommendations.push('✅ Session should appear in both dashboards - check authentication and browser console logs')
    }

    if (!request) {
      recommendations.push('Create a session_request record linked to this session (parent_session_id)')
    }

    results.recommendations = recommendations

    return NextResponse.json(results)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
