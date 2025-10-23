import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Prevent this from being called during build
export const dynamic = 'force-dynamic'

/**
 * Cleanup endpoint to remove ghost/test session requests
 * that were created during builds and are causing repeated notifications
 */
export async function POST() {
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

    // Also clean up any old pending requests (older than 24 hours)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: oldRequests, error: oldError } = await supabaseAdmin
      .from('session_requests')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', twentyFourHoursAgo.toISOString())
      .select()

    if (oldError) {
      console.error('[cleanup-ghost-requests] Error deleting old requests:', oldError)
    } else {
      console.log('[cleanup-ghost-requests] Deleted old requests:', oldRequests?.length || 0)
    }

    const totalDeleted = (deletedRequests?.length || 0) + (oldRequests?.length || 0)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalDeleted} ghost requests`,
      details: {
        testCustomerRequests: deletedRequests?.length || 0,
        oldPendingRequests: oldRequests?.length || 0,
      }
    })
  } catch (error: any) {
    console.error('[cleanup-ghost-requests] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
