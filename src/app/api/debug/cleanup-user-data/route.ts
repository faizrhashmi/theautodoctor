import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

/**
 * Clean up ALL session-related data for the authenticated customer user
 * This is useful for clearing test data from the customer dashboard
 *
 * WARNING: This deletes ALL sessions, not just old ones!
 * SECURITY: Protected by admin-only access in production
 */
async function postHandler(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    console.log(`[cleanup-user-data] Cleaning all session data for user: ${user.id}`)

    // Step 1: Get all sessions for this user
    const { data: userSessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, created_at')
      .eq('customer_user_id', user.id)

    if (sessionsError) {
      console.error('[cleanup-user-data] Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const sessionIds = (userSessions || []).map(s => s.id)

    console.log(`[cleanup-user-data] Found ${sessionIds.length} session(s) to clean`)

    const stats = {
      sessionsDeleted: 0,
      requestsDeleted: 0,
      participantsDeleted: 0,
      filesDeleted: 0,
    }

    if (sessionIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sessions found for this user',
        stats,
      })
    }

    // Step 2: Delete session files
    const { data: deletedFiles, error: filesError } = await supabaseAdmin
      .from('session_files')
      .delete()
      .in('session_id', sessionIds)
      .select('id')

    if (!filesError) {
      stats.filesDeleted = deletedFiles?.length || 0
      console.log(`[cleanup-user-data] Deleted ${stats.filesDeleted} file(s)`)
    }

    // Step 3: Delete session participants
    const { data: deletedParticipants, error: participantsError } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .in('session_id', sessionIds)
      .select('id')

    if (!participantsError) {
      stats.participantsDeleted = deletedParticipants?.length || 0
      console.log(`[cleanup-user-data] Deleted ${stats.participantsDeleted} participant(s)`)
    }

    // Step 4: Delete session requests
    const { data: deletedRequests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .eq('customer_id', user.id)
      .select('id')

    if (!requestsError) {
      stats.requestsDeleted = deletedRequests?.length || 0
      console.log(`[cleanup-user-data] Deleted ${stats.requestsDeleted} request(s)`)
    }

    // Step 5: Delete sessions
    const { data: deletedSessions, error: deleteError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('customer_user_id', user.id)
      .select('id')

    if (deleteError) {
      console.error('[cleanup-user-data] Error deleting sessions:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    stats.sessionsDeleted = deletedSessions?.length || 0
    console.log(`[cleanup-user-data] Deleted ${stats.sessionsDeleted} session(s)`)

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned all session data for user`,
      stats,
      totalDeleted: stats.sessionsDeleted + stats.requestsDeleted + stats.participantsDeleted + stats.filesDeleted,
    })
  } catch (error: any) {
    console.error('[cleanup-user-data] Exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET endpoint to preview what would be deleted
 * SECURITY: Protected by admin-only access in production
 */
async function getHandler(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    // Count sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, created_at, plan, type')
      .eq('customer_user_id', user.id)

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const sessionIds = (sessions || []).map(s => s.id)

    // Count related data
    const counts = {
      sessions: sessions?.length || 0,
      sessionDetails: sessions || [],
      requests: 0,
      participants: 0,
      files: 0,
    }

    if (sessionIds.length > 0) {
      const { count: requestsCount } = await supabaseAdmin
        .from('session_requests')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id)

      const { count: participantsCount } = await supabaseAdmin
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds)

      const { count: filesCount } = await supabaseAdmin
        .from('session_files')
        .select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds)

      counts.requests = requestsCount || 0
      counts.participants = participantsCount || 0
      counts.files = filesCount || 0
    }

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      wouldDelete: counts,
      totalItems: counts.sessions + counts.requests + counts.participants + counts.files,
      warning: 'Use POST method to actually delete this data',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const POST = withDebugAuth(postHandler)
export const GET = withDebugAuth(getHandler)
