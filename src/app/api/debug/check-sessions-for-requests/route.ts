import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Get all accepted requests
    const { data: acceptedRequests, error: reqError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id, mechanic_id, parent_session_id, accepted_at')
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 })
    }

    // For each accepted request, find its session
    const results = await Promise.all(
      (acceptedRequests || []).map(async (req) => {
        if (!req.parent_session_id) {
          return {
            request_id: req.id,
            parent_session_id: null,
            session_status: 'NO_PARENT_SESSION_ID',
            session_found: false,
          }
        }

        const { data: session, error: sessError } = await supabaseAdmin
          .from('sessions')
          .select('id, status, created_at, started_at, ended_at')
          .eq('id', req.parent_session_id)
          .maybeSingle()

        return {
          request_id: req.id,
          parent_session_id: req.parent_session_id,
          session_status: session?.status || 'NOT_FOUND',
          session_found: !!session,
          session_created: session?.created_at,
          session_started: session?.started_at,
          session_ended: session?.ended_at,
        }
      })
    )

    return NextResponse.json({
      total_accepted_requests: acceptedRequests?.length || 0,
      results,
      summary: {
        completed_sessions: results.filter(r => r.session_status === 'completed').length,
        active_sessions: results.filter(r => ['pending', 'waiting', 'live', 'scheduled'].includes(r.session_status)).length,
        no_parent_session: results.filter(r => !r.parent_session_id).length,
        session_not_found: results.filter(r => r.session_status === 'NOT_FOUND').length,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
