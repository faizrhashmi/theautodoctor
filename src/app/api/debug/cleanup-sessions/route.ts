import { NextResponse } from 'next/server'
import { runFullCleanup } from '@/lib/sessionCleanup'

/**
 * Admin endpoint to manually trigger comprehensive session cleanup
 *
 * This endpoint runs the centralized cleanup utility that:
 * - Cancels expired session requests (>15 minutes old, no mechanic assigned)
 * - Cancels associated waiting sessions
 * - Cleans up orphaned sessions (waiting sessions without valid requests)
 *
 * Safe to run frequently - only cleans up truly problematic sessions
 */
export async function POST() {
  try {
    console.log('[debug/cleanup-sessions] Manual cleanup triggered')

    const stats = await runFullCleanup()

    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed',
      stats,
    })
  } catch (error: any) {
    console.error('[debug/cleanup-sessions] Error during cleanup:', error)
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
 * GET endpoint to check cleanup stats without making changes
 */
export async function GET() {
  try {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()

    // Count expired requests
    const { data: expiredRequests } = await supabaseAdmin
      .from('session_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .lt('created_at', fifteenMinutesAgo)

    // Count old waiting sessions
    const { data: oldWaitingSessions } = await supabaseAdmin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('created_at', fifteenMinutesAgo)

    // Count all waiting sessions (potential orphans)
    const { data: allWaitingSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id')
      .eq('status', 'waiting')
      .lt('created_at', twentyMinutesAgo)

    // Count pending requests
    const { data: allPendingRequests } = await supabaseAdmin
      .from('session_requests')
      .select('customer_id')
      .eq('status', 'pending')
      .is('mechanic_id', null)

    const customersWithRequests = new Set(
      allPendingRequests?.map(r => r.customer_id) || []
    )

    const potentialOrphans = allWaitingSessions?.filter(
      s => s.customer_user_id && !customersWithRequests.has(s.customer_user_id)
    ).length || 0

    return NextResponse.json({
      wouldClean: {
        expiredRequests: expiredRequests?.length || 0,
        oldWaitingSessions: oldWaitingSessions?.length || 0,
        potentialOrphans,
        total: (expiredRequests?.length || 0) + (oldWaitingSessions?.length || 0) + potentialOrphans,
      },
      tip: 'Use POST method to actually clean these up',
    })
  } catch (error: any) {
    console.error('[debug/cleanup-sessions] Error checking stats:', error)
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    )
  }
}
