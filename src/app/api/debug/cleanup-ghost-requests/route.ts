import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

// Prevent this from being called during build
export const dynamic = 'force-dynamic'

/**
 * Cleanup endpoint to remove ghost/test session requests
 * that were created during builds and are causing repeated notifications
 */
async function postHandler() {
  try {
    console.log('[cleanup-ghost-requests] Starting cleanup...')

    // Delete all pending requests for test customer "Aafia Hashmi"
    const { data: deletedRequests, error: deleteError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .eq('customer_name', 'Aafia Hashmi')
      .eq('status', 'pending')
      .select()

    if (deleteError) {
      console.error('[cleanup-ghost-requests] Error deleting:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log('[cleanup-ghost-requests] Deleted requests:', deletedRequests?.length || 0)

    // UPDATED: Instead of deleting old pending requests, expire them properly
    const now = new Date().toISOString()
    const { data: shouldExpire, error: expireCheckError } = await supabaseAdmin
      .from('session_requests')
      .select('id')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)

    let expiredCount = 0
    if (!expireCheckError && shouldExpire && shouldExpire.length > 0) {
      // Call the expiration function
      const { data: expireResult } = await supabaseAdmin.rpc('expire_old_session_requests')
      expiredCount = expireResult?.[0]?.expired_count ?? 0
      console.log('[cleanup-ghost-requests] Expired pending requests:', expiredCount)
    }

    // Also clean up very old requests (older than 7 days) by deleting them
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: oldRequests, error: oldError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .in('status', ['pending', 'expired', 'cancelled'])
      .lt('created_at', sevenDaysAgo.toISOString())
      .select()

    if (oldError) {
      console.error('[cleanup-ghost-requests] Error deleting old requests:', oldError)
    } else {
      console.log('[cleanup-ghost-requests] Deleted old requests:', oldRequests?.length || 0)
    }

    const totalDeleted = (deletedRequests?.length || 0) + (oldRequests?.length || 0)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalDeleted} ghost requests and expired ${expiredCount} stuck requests`,
      details: {
        testCustomerRequests: deletedRequests?.length || 0,
        expiredStuckRequests: expiredCount,
        oldRequestsDeleted: oldRequests?.length || 0,
      }
    })
  } catch (error: any) {
    console.error('[cleanup-ghost-requests] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const POST = withDebugAuth(postHandler)
