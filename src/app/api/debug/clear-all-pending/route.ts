import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


export const dynamic = 'force-dynamic'

async function postHandler(req: NextRequest) {
  try {
    // Get ALL pending requests
    const { data: pendingRequests, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id, session_type, created_at')
      .eq('status', 'pending')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const cancelled = []

    // Mark ALL pending requests as cancelled
    for (const request of pendingRequests || []) {
      const { error: updateError } = await supabaseAdmin
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('id', request.id)

      if (!updateError) {
        cancelled.push({
          id: request.id.substring(0, 8),
          customer: request.customer_id.substring(0, 8),
          type: request.session_type,
          created: request.created_at
        })
      }
    }

    return NextResponse.json({
      success: true,
      total_cancelled: cancelled.length,
      requests: cancelled
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const POST = withDebugAuth(postHandler)
