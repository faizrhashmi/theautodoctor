import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Check specific request and session details
 * GET /api/debug/request-details?requestId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')
    const sessionId = searchParams.get('sessionId')

    const result: any = {
      timestamp: new Date().toISOString(),
    }

    // Get request details
    if (requestId) {
      const { data: request, error: requestError } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      result.request = {
        found: !!request,
        error: requestError?.message,
        data: request,
        checks: {
          status_is_pending: request?.status === 'pending',
          status_is_unattended: request?.status === 'unattended',
          mechanic_is_null: request?.mechanic_id === null,
          can_accept: (request?.status === 'pending' || request?.status === 'unattended') && request?.mechanic_id === null
        }
      }

      // Get linked session
      const sessionIdFromMetadata = request?.metadata?.session_id
      if (sessionIdFromMetadata) {
        const { data: session, error: sessionError } = await supabaseAdmin
          .from('sessions')
          .select('*')
          .eq('id', sessionIdFromMetadata)
          .single()

        result.linked_session = {
          found: !!session,
          error: sessionError?.message,
          data: session,
          checks: {
            status: session?.status,
            mechanic_id: session?.mechanic_id,
            mechanic_is_null: session?.mechanic_id === null,
            can_update: session?.status === 'pending' && session?.mechanic_id === null
          }
        }
      }
    }

    // Get session details
    if (sessionId) {
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      result.session = {
        found: !!session,
        error: sessionError?.message,
        data: session
      }

      // Find related request
      const { data: relatedRequests } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .eq('customer_id', session?.customer_user_id)
        .order('created_at', { ascending: false })
        .limit(5)

      result.related_requests = relatedRequests
    }

    return NextResponse.json(result)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
