import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Health check endpoint to monitor session and request state
 *
 * Provides visibility into:
 * - Active sessions by status
 * - Session requests by status
 * - Age distribution of waiting sessions
 * - Potential problems (stale sessions, orphaned sessions, etc.)
 */
export async function GET() {
  try {
    const now = Date.now()
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString()
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000).toISOString()

    // Session counts by status
    const { data: allSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, status, created_at, customer_user_id, mechanic_id')

    const sessionsByStatus = {
      pending: 0,
      waiting: 0,
      live: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    }

    const waitingSessions: any[] = []

    allSessions?.forEach(session => {
      if (session.status && session.status in sessionsByStatus) {
        sessionsByStatus[session.status as keyof typeof sessionsByStatus]++
      }
      if (session.status === 'waiting') {
        waitingSessions.push(session)
      }
    })

    // Request counts by status
    const { data: allRequests } = await supabaseAdmin
      .from('session_requests')
      .select('id, status, created_at, customer_id, mechanic_id')

    const requestsByStatus = {
      pending: 0,
      accepted: 0,
      cancelled: 0,
    }

    const pendingRequests: any[] = []

    allRequests?.forEach(request => {
      if (request.status in requestsByStatus) {
        requestsByStatus[request.status as keyof typeof requestsByStatus]++
      }
      if (request.status === 'pending' && !request.mechanic_id) {
        pendingRequests.push(request)
      }
    })

    // Analyze waiting sessions
    const staleWaitingSessions = waitingSessions.filter(
      s => new Date(s.created_at).toISOString() < fifteenMinutesAgo
    )

    const veryStaleWaitingSessions = waitingSessions.filter(
      s => new Date(s.created_at).toISOString() < thirtyMinutesAgo
    )

    // Analyze pending requests
    const stalePendingRequests = pendingRequests.filter(
      r => new Date(r.created_at).toISOString() < fifteenMinutesAgo
    )

    // Find orphaned sessions (waiting sessions without pending requests)
    const customerIdsWithPendingRequests = new Set(
      pendingRequests.map(r => r.customer_id)
    )

    const orphanedSessions = waitingSessions.filter(
      s => !customerIdsWithPendingRequests.has(s.customer_user_id)
    )

    // Detect problems
    const problems: string[] = []

    if (staleWaitingSessions.length > 0) {
      problems.push(`${staleWaitingSessions.length} waiting sessions older than 15 minutes`)
    }

    if (veryStaleWaitingSessions.length > 0) {
      problems.push(`${veryStaleWaitingSessions.length} waiting sessions older than 30 minutes (CRITICAL!)`)
    }

    if (stalePendingRequests.length > 0) {
      problems.push(`${stalePendingRequests.length} pending requests older than 15 minutes`)
    }

    if (orphanedSessions.length > 0) {
      problems.push(`${orphanedSessions.length} orphaned waiting sessions (no corresponding request)`)
    }

    const health = problems.length === 0 ? 'healthy' : 'issues_detected'

    return NextResponse.json({
      health,
      timestamp: new Date().toISOString(),
      sessions: {
        total: allSessions?.length || 0,
        byStatus: sessionsByStatus,
        waiting: {
          total: waitingSessions.length,
          stale: staleWaitingSessions.length,
          veryStale: veryStaleWaitingSessions.length,
        },
      },
      requests: {
        total: allRequests?.length || 0,
        byStatus: requestsByStatus,
        pending: {
          total: pendingRequests.length,
          stale: stalePendingRequests.length,
        },
      },
      problems,
      recommendations:
        problems.length > 0
          ? [
              'Run cleanup via POST /api/debug/cleanup-sessions',
              'Check for issues in session creation flow',
              'Verify mechanic real-time notifications are working',
            ]
          : ['All systems healthy'],
      details: {
        staleWaitingSessions: staleWaitingSessions.map(s => ({
          id: s.id,
          age: Math.floor((now - new Date(s.created_at).getTime()) / 1000 / 60) + ' minutes',
          customerId: s.customer_user_id,
        })),
        stalePendingRequests: stalePendingRequests.map(r => ({
          id: r.id,
          age: Math.floor((now - new Date(r.created_at).getTime()) / 1000 / 60) + ' minutes',
          customerId: r.customer_id,
        })),
        orphanedSessions: orphanedSessions.map(s => ({
          id: s.id,
          age: Math.floor((now - new Date(s.created_at).getTime()) / 1000 / 60) + ' minutes',
          customerId: s.customer_user_id,
        })),
      },
    })
  } catch (error: any) {
    console.error('[debug/session-health] Error checking health:', error)
    return NextResponse.json(
      {
        health: 'error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
