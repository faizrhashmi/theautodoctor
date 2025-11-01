import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


export const dynamic = 'force-dynamic'

async function postHandler(req: NextRequest) {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get all accepted requests
    const { data: allAccepted, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, status, mechanic_id, parent_session_id, created_at, accepted_at')
      .eq('status', 'accepted')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results = {
      checked: allAccepted?.length || 0,
      cleaned: 0,
      details: [] as any[]
    }

    for (const request of allAccepted || []) {
      // Check if parent session exists and what its status is
      if (request.parent_session_id) {
        const { data: session } = await supabaseAdmin
          .from('sessions')
          .select('id, status')
          .eq('id', request.parent_session_id)
          .maybeSingle()

        if (session) {
          // If session is completed or cancelled, mark request accordingly
          if (session.status === 'completed' || session.status === 'cancelled') {
            const { error: updateError } = await supabaseAdmin
              .from('session_requests')
              .update({ status: session.status })
              .eq('id', request.id)

            if (!updateError) {
              results.cleaned++
              results.details.push({
                request_id: request.id.substring(0, 8),
                action: 'marked_' + session.status,
                session_status: session.status
              })
            }
          }
        } else {
          // Session doesn't exist - mark as cancelled
          const { error: updateError } = await supabaseAdmin
            .from('session_requests')
            .update({ status: 'cancelled' })
            .eq('id', request.id)

          if (!updateError) {
            results.cleaned++
            results.details.push({
              request_id: request.id.substring(0, 8),
              action: 'marked_cancelled',
              reason: 'session_not_found'
            })
          }
        }
      } else {
        // No parent_session_id - if older than 1 day, cancel it
        const createdAt = new Date(request.created_at)
        if (createdAt < oneDayAgo) {
          const { error: updateError } = await supabaseAdmin
            .from('session_requests')
            .update({ status: 'cancelled' })
            .eq('id', request.id)

          if (!updateError) {
            results.cleaned++
            results.details.push({
              request_id: request.id.substring(0, 8),
              action: 'marked_cancelled',
              reason: 'old_request_no_session'
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const POST = withDebugAuth(postHandler)
