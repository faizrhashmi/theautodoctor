import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

/**
 * ⚠️ ADMIN ONLY: Clear all session requests
 *
 * This endpoint deletes ALL session requests from the database.
 * Use with caution - this action cannot be undone.
 *
 * DELETE /api/admin/clear-session-requests
 */
export async function DELETE(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    console.warn(
      `[SECURITY] Admin ${admin.email} clearing ALL session requests`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Count before deletion
    const { count: beforeCount } = await supabaseAdmin
      .from('session_requests')
      .select('*', { count: 'exact', head: true })

    console.log(`[ADMIN] About to delete ${beforeCount} session requests`)

    // Delete all session requests
    const { error: deleteError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using a condition that matches everything)

    if (deleteError) {
      console.error('[ADMIN] Error deleting session requests:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete session requests',
        details: deleteError.message
      }, { status: 500 })
    }

    // Verify deletion
    const { count: afterCount } = await supabaseAdmin
      .from('session_requests')
      .select('*', { count: 'exact', head: true })

    console.log(`[ADMIN] Deleted ${beforeCount} session requests. Remaining: ${afterCount}`)

    return NextResponse.json({
      success: true,
      message: 'All session requests deleted',
      deleted_count: beforeCount || 0,
      remaining_count: afterCount || 0
    })

  } catch (error: any) {
    console.error('[ADMIN] Error clearing session requests:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// Also support GET to see how many requests exist
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: requests, count } = await supabaseAdmin
      .from('session_requests')
      .select('status', { count: 'exact' })

    // Count by status
    const byStatus = requests?.reduce((acc: Record<string, number>, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      total_count: count || 0,
      by_status: byStatus || {},
      requests: requests || []
    })

  } catch (error: any) {
    console.error('[ADMIN] Error fetching session requests:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
