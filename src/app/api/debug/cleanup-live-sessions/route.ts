import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

/**
 * Admin endpoint to clean up stale 'live' sessions
 *
 * Finds sessions that have been in 'live' status for more than a specified time
 * and marks them as 'completed' to prevent ghost sessions from blocking customers.
 */
async function postHandler(request: Request) {
  try {
    const { maxAgeMinutes = 120 } = await request.json().catch(() => ({}))

    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

    console.log(`[cleanup-live-sessions] Checking for 'live' sessions older than ${maxAgeMinutes} minutes (before ${cutoffTime})`)

    // Find all 'live' sessions older than cutoff
    const { data: liveSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, created_at, started_at, customer_user_id')
      .eq('status', 'live')
      .lt('created_at', cutoffTime)

    if (fetchError) {
      console.error('[cleanup-live-sessions] Error fetching live sessions:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!liveSessions || liveSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale live sessions found',
        cleaned: 0,
      })
    }

    console.log(`[cleanup-live-sessions] Found ${liveSessions.length} stale 'live' session(s):`, liveSessions)

    // Mark them as completed
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'live')
      .lt('created_at', cutoffTime)

    if (updateError) {
      console.error('[cleanup-live-sessions] Error updating sessions:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[cleanup-live-sessions] Successfully marked ${liveSessions.length} session(s) as completed`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${liveSessions.length} stale live session(s)`,
      cleaned: liveSessions.length,
      sessions: liveSessions.map(s => ({
        id: s.id,
        created_at: s.created_at,
        customer_user_id: s.customer_user_id,
      })),
    })
  } catch (error: any) {
    console.error('[cleanup-live-sessions] Error during cleanup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check how many stale live sessions exist without cleaning them
 */
async function getHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const maxAgeMinutes = parseInt(searchParams.get('maxAgeMinutes') || '120', 10)

    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

    // Count 'live' sessions older than cutoff
    const { data: liveSessions, error } = await supabaseAdmin
      .from('sessions')
      .select('id, created_at, started_at, customer_user_id, plan, type')
      .eq('status', 'live')
      .lt('created_at', cutoffTime)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: liveSessions?.length || 0,
      maxAgeMinutes,
      cutoffTime,
      sessions: liveSessions || [],
      message: liveSessions && liveSessions.length > 0
        ? `Found ${liveSessions.length} stale 'live' session(s). Use POST to clean them up.`
        : 'No stale live sessions found.',
    })
  } catch (error: any) {
    console.error('[cleanup-live-sessions] Error checking stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Apply debug authentication wrapper
export const POST = withDebugAuth(postHandler)
export const GET = withDebugAuth(getHandler)
