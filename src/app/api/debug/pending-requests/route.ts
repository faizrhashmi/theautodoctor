import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

/**
 * DEBUG ENDPOINT - Check pending session requests
 * GET /api/debug/pending-requests
 */
async function getHandler(req: NextRequest) {
  try {
    // Get all pending session_requests
    const { data: requests, error } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 })
    }

    // Get all pending sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, customer_user_id, mechanic_id, created_at, plan, type, intake_id')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      return NextResponse.json({
        error: sessionsError.message,
        details: sessionsError
      }, { status: 500 })
    }

    // Get count of all session_requests by status
    const { data: allRequests } = await supabaseAdmin
      .from('session_requests')
      .select('id, status, customer_id, mechanic_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pending_requests: {
        count: requests?.length || 0,
        data: requests || []
      },
      pending_sessions: {
        count: sessions?.length || 0,
        data: sessions || []
      },
      recent_all_requests: {
        count: allRequests?.length || 0,
        data: allRequests || []
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
