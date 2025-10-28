import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

/**
 * Cleanup endpoint for pending sessions that never started
 *
 * GET /api/debug/cleanup-pending-sessions
 *
 * Marks pending sessions as:
 * - unattended (5+ minutes old, never started)
 * - expired (120+ minutes old, never started)
 */
async function getHandler() {
  try {
    const unattendedCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const expiredCutoff = new Date(Date.now() - 120 * 60 * 1000).toISOString()

    // Mark as expired (>120 min, never started)
    const { data: expiredSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, created_at, customer_user_id')
      .eq('status', 'pending')
      .is('started_at', null)
      .lt('created_at', expiredCutoff)

    let expiredCount = 0
    if (expiredSessions && expiredSessions.length > 0) {
      console.log(`[cleanup-pending] Marking ${expiredSessions.length} pending session(s) as expired`)

      const { error } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'expired',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending')
        .is('started_at', null)
        .lt('created_at', expiredCutoff)

      if (!error) {
        expiredCount = expiredSessions.length
      }
    }

    // Mark as unattended (>5 min but <120 min, never started)
    const { data: unattendedSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, created_at, customer_user_id')
      .eq('status', 'pending')
      .is('started_at', null)
      .gte('created_at', expiredCutoff)
      .lt('created_at', unattendedCutoff)

    let unattendedCount = 0
    if (unattendedSessions && unattendedSessions.length > 0) {
      console.log(`[cleanup-pending] Marking ${unattendedSessions.length} pending session(s) as unattended`)

      const { error } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'unattended',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending')
        .is('started_at', null)
        .gte('created_at', expiredCutoff)
        .lt('created_at', unattendedCutoff)

      if (!error) {
        unattendedCount = unattendedSessions.length
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      unattendedCount,
      totalCleaned: expiredCount + unattendedCount,
      message: `Cleaned ${expiredCount} expired and ${unattendedCount} unattended pending sessions`
    })

  } catch (error) {
    console.error('[cleanup-pending] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
