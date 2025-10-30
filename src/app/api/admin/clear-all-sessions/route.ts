import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

/**
 * ⚠️ ADMIN ONLY: Nuclear option - Clear ALL sessions and requests
 *
 * This endpoint deletes:
 * - ALL session_requests
 * - ALL sessions
 * - ALL session-related data
 *
 * Use with EXTREME caution - this action cannot be undone.
 *
 * DELETE /api/admin/clear-all-sessions
 */
export async function DELETE(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    // Log who initiated this dangerous operation
    console.warn(
      `[SECURITY] NUCLEAR CLEANUP initiated by admin: ${admin.email || admin.email} (${auth.user?.id})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const results = {
      session_requests: { before: 0, after: 0 },
      sessions: { before: 0, after: 0 },
      errors: [] as string[]
    }

    console.log('🔥 [ADMIN] Starting NUCLEAR cleanup - deleting ALL sessions and requests')

    // 1. Count session_requests before deletion
    const { count: requestsBefore } = await supabaseAdmin
      .from('session_requests')
      .select('*', { count: 'exact', head: true })
    results.session_requests.before = requestsBefore || 0

    // 2. Count sessions before deletion
    const { count: sessionsBefore } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
    results.sessions.before = sessionsBefore || 0

    console.log(`📊 Before deletion:`)
    console.log(`   - Session Requests: ${results.session_requests.before}`)
    console.log(`   - Sessions: ${results.sessions.before}`)

    // 3. Delete ALL session_requests
    const { error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Matches all rows

    if (requestsError) {
      console.error('❌ Error deleting session_requests:', requestsError)
      results.errors.push(`Session requests: ${requestsError.message}`)
    } else {
      console.log('✅ Deleted all session_requests')
    }

    // 4. Delete ALL sessions
    const { error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Matches all rows

    if (sessionsError) {
      console.error('❌ Error deleting sessions:', sessionsError)
      results.errors.push(`Sessions: ${sessionsError.message}`)
    } else {
      console.log('✅ Deleted all sessions')
    }

    // 5. Count after deletion
    const { count: requestsAfter } = await supabaseAdmin
      .from('session_requests')
      .select('*', { count: 'exact', head: true })
    results.session_requests.after = requestsAfter || 0

    const { count: sessionsAfter } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
    results.sessions.after = sessionsAfter || 0

    console.log(`📊 After deletion:`)
    console.log(`   - Session Requests: ${results.session_requests.after}`)
    console.log(`   - Sessions: ${results.sessions.after}`)

    const totalDeleted =
      (results.session_requests.before - results.session_requests.after) +
      (results.sessions.before - results.sessions.after)

    console.log(`🎉 [ADMIN] Cleanup complete! Deleted ${totalDeleted} total records`)

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Deleted ${totalDeleted} total records`,
      details: results,
      summary: {
        session_requests_deleted: results.session_requests.before - results.session_requests.after,
        sessions_deleted: results.sessions.before - results.sessions.after,
        total_deleted: totalDeleted
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error: any) {
    console.error('💥 [ADMIN] Fatal error during cleanup:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// GET to see counts without deleting
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Count session_requests
    const { data: requests, count: requestsCount } = await supabaseAdmin
      .from('session_requests')
      .select('status', { count: 'exact' })

    // Count sessions
    const { data: sessions, count: sessionsCount } = await supabaseAdmin
      .from('sessions')
      .select('status', { count: 'exact' })

    // Count by status for requests
    const requestsByStatus = requests?.reduce((acc: Record<string, number>, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {})

    // Count by status for sessions
    const sessionsByStatus = sessions?.reduce((acc: Record<string, number>, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      session_requests: {
        total: requestsCount || 0,
        by_status: requestsByStatus || {}
      },
      sessions: {
        total: sessionsCount || 0,
        by_status: sessionsByStatus || {}
      },
      total_records: (requestsCount || 0) + (sessionsCount || 0)
    })

  } catch (error: any) {
    console.error('[ADMIN] Error fetching counts:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
