import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Clear Stuck Accepted Requests - EMERGENCY UNBLOCK TOOL
 *
 * This endpoint clears orphaned "accepted" requests that are blocking mechanics.
 * Use case: Mechanic gets error "You already have an accepted request" but can't see it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mechanicId } = body

    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId is required' }, { status: 400 })
    }

    console.log(`[clear-stuck-requests] Clearing for mechanic ${mechanicId}`)

    const now = new Date().toISOString()

    // Step 1: Find ALL accepted requests for this mechanic
    const { data: acceptedRequests, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'accepted')

    if (fetchError) {
      console.error('[clear-stuck-requests] Error fetching requests:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    if (!acceptedRequests || acceptedRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck requests found',
        cleared: 0
      })
    }

    console.log(`[clear-stuck-requests] Found ${acceptedRequests.length} accepted requests`)

    // Step 2: Cancel all accepted requests
    const { error: cancelError } = await supabaseAdmin
      .from('session_requests')
      .update({
        status: 'cancelled',
        updated_at: now
      })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'accepted')

    if (cancelError) {
      console.error('[clear-stuck-requests] Error cancelling requests:', cancelError)
      return NextResponse.json({ error: 'Failed to cancel requests' }, { status: 500 })
    }

    // Step 3: Release mechanic from any waiting sessions
    const customerIds = acceptedRequests.map(r => r.customer_id)

    const { error: releaseError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'cancelled',
        mechanic_id: null,  // Release the mechanic
        ended_at: now,
        updated_at: now
      })
      .eq('mechanic_id', mechanicId)
      .in('customer_user_id', customerIds)
      .eq('status', 'waiting')

    if (releaseError) {
      console.error('[clear-stuck-requests] Error releasing sessions:', releaseError)
      // Don't fail - requests are already cancelled
    }

    console.log(`[clear-stuck-requests] Cleared ${acceptedRequests.length} stuck request(s)`)

    return NextResponse.json({
      success: true,
      message: `Cleared ${acceptedRequests.length} stuck request(s)`,
      cleared: acceptedRequests.length
    })

  } catch (error: any) {
    console.error('[clear-stuck-requests] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
