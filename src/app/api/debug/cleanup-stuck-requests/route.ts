import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Get all accepted requests
    const { data: acceptedRequests, error: reqError } = await supabaseAdmin
      .from('session_requests')
      .select('id, parent_session_id')
      .eq('status', 'accepted')

    if (reqError) {
      return NextResponse.json({ error: reqError.message }, { status: 500 })
    }

    const results = []

    for (const request of acceptedRequests || []) {
      if (!request.parent_session_id) {
        results.push({
          request_id: request.id,
          action: 'skipped',
          reason: 'no_parent_session_id',
        })
        continue
      }

      // Check if the session is completed or cancelled
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('id, status')
        .eq('id', request.parent_session_id)
        .maybeSingle()

      if (!session) {
        results.push({
          request_id: request.id,
          action: 'skipped',
          reason: 'session_not_found',
        })
        continue
      }

      if (session.status === 'completed' || session.status === 'cancelled') {
        // Update the request to match the session status
        const { error: updateError } = await supabaseAdmin
          .from('session_requests')
          .update({ status: session.status })
          .eq('id', request.id)

        results.push({
          request_id: request.id,
          session_id: session.id,
          action: updateError ? 'failed' : 'updated',
          new_status: session.status,
          error: updateError?.message,
        })
      } else {
        results.push({
          request_id: request.id,
          session_id: session.id,
          action: 'skipped',
          reason: `session_status_is_${session.status}`,
        })
      }
    }

    const summary = {
      total_checked: acceptedRequests?.length || 0,
      updated: results.filter(r => r.action === 'updated').length,
      failed: results.filter(r => r.action === 'failed').length,
      skipped: results.filter(r => r.action === 'skipped').length,
    }

    return NextResponse.json({ summary, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
