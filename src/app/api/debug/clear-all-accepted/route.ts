import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Get ALL accepted requests (regardless of age)
    const { data: acceptedRequests, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, parent_session_id, created_at')
      .eq('status', 'accepted')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const cancelled = []

    // Mark ALL accepted requests as cancelled
    for (const request of acceptedRequests || []) {
      const { error: updateError } = await supabaseAdmin
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('id', request.id)

      if (!updateError) {
        cancelled.push({
          id: request.id.substring(0, 8),
          parent_session: request.parent_session_id ? request.parent_session_id.substring(0, 8) : 'none',
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
