import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Force End All Sessions - EMERGENCY MECHANIC CONTROL
 *
 * Terminates ALL work assigned to a mechanic:
 * - Sessions in 'waiting' or 'live' status → cancelled
 * - Accepted requests without sessions → cancelled
 * - Pending/unattended requests → cancelled
 *
 * Use case: Mechanic is stuck and needs to clear everything to start fresh
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mechanicId } = body

    if (!mechanicId) {
      return NextResponse.json({ error: 'mechanicId is required' }, { status: 400 })
    }

    console.log(`[force-end-all] Starting for mechanic ${mechanicId}`)

    const now = new Date().toISOString()
    const results = {
      sessionsCancelled: 0,
      requestsCancelled: 0,
      errors: [] as string[]
    }

    // Step 1: Cancel ALL sessions assigned to this mechanic (waiting + live)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status')
      .eq('mechanic_id', mechanicId)
      .in('status', ['waiting', 'live', 'pending'])

    if (sessionsError) {
      console.error('[force-end-all] Error fetching sessions:', sessionsError)
      results.errors.push(`Failed to fetch sessions: ${sessionsError.message}`)
    } else if (sessions && sessions.length > 0) {
      console.log(`[force-end-all] Found ${sessions.length} sessions to cancel`)

      const { error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'cancelled',
          ended_at: now,
          updated_at: now
        })
        .eq('mechanic_id', mechanicId)
        .in('status', ['waiting', 'live', 'pending'])

      if (updateError) {
        console.error('[force-end-all] Error cancelling sessions:', updateError)
        results.errors.push(`Failed to cancel sessions: ${updateError.message}`)
      } else {
        results.sessionsCancelled = sessions.length
        console.log(`[force-end-all] Cancelled ${sessions.length} sessions`)
      }
    }

    // Step 2: Cancel ALL session_requests assigned to this mechanic
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('id, status')
      .eq('mechanic_id', mechanicId)
      .in('status', ['pending', 'accepted', 'unattended'])

    if (requestsError) {
      console.error('[force-end-all] Error fetching requests:', requestsError)
      results.errors.push(`Failed to fetch requests: ${requestsError.message}`)
    } else if (requests && requests.length > 0) {
      console.log(`[force-end-all] Found ${requests.length} requests to cancel`)

      const { error: updateError } = await supabaseAdmin
        .from('session_requests')
        .update({
          status: 'cancelled',
          updated_at: now
        })
        .eq('mechanic_id', mechanicId)
        .in('status', ['pending', 'accepted', 'unattended'])

      if (updateError) {
        console.error('[force-end-all] Error cancelling requests:', updateError)
        results.errors.push(`Failed to cancel requests: ${updateError.message}`)
      } else {
        results.requestsCancelled = requests.length
        console.log(`[force-end-all] Cancelled ${requests.length} requests`)
      }
    }

    const totalCancelled = results.sessionsCancelled + results.requestsCancelled

    if (totalCancelled === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active sessions or requests to cancel',
        results
      })
    }

    console.log(`[force-end-all] Complete: ${totalCancelled} items cancelled`)

    return NextResponse.json({
      success: true,
      message: `Successfully cancelled ${totalCancelled} item(s)`,
      results
    })

  } catch (error: any) {
    console.error('[force-end-all] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
