import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function clearOldRequests() {
  try {
    // Get all pending requests older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: oldRequests, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_name, session_type, plan_code, created_at')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .lt('created_at', fiveMinutesAgo)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!oldRequests || oldRequests.length === 0) {
      return NextResponse.json({
        message: 'No old requests to clear',
        cleared: 0
      })
    }

    // Cancel (not delete) old pending requests
    const { error: updateError } = await supabaseAdmin
      .from('session_requests')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .lt('created_at', fiveMinutesAgo)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Cancelled ${oldRequests.length} old pending request(s)`,
      cleared: oldRequests.length,
      requests: oldRequests
    })
  } catch (error: any) {
    console.error('Error clearing old requests:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getHandler() {
  return clearOldRequests()
}

async function postHandler() {
  return clearOldRequests()
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
export const POST = withDebugAuth(postHandler)
