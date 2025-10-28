import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function getHandler() {
  try {
    const now = new Date().toISOString()

    // Get all session requests (last 20)
    const { data: allRequests, error: allError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (allError) {
      console.error('Error fetching all requests:', allError)
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }

    // Get pending requests with null mechanic_id
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: true })

    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError)
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    // Get expired requests
    const { data: expiredRequests, error: expiredError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'expired')
      .order('created_at', { ascending: false })
      .limit(10)

    if (expiredError) {
      console.error('Error fetching expired requests:', expiredError)
      return NextResponse.json({ error: expiredError.message }, { status: 500 })
    }

    // Find requests that SHOULD be expired but aren't yet
    const { data: shouldBeExpired, error: shouldBeExpiredError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', now)

    if (shouldBeExpiredError) {
      console.error('Error fetching should-be-expired requests:', shouldBeExpiredError)
    }

    // Count by status
    const statusCounts = allRequests?.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) ?? {}

    // Check for stuck requests (pending for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const stuckRequests = pendingRequests?.filter(req =>
      req.created_at < thirtyMinutesAgo
    ) ?? []

    return NextResponse.json({
      summary: {
        totalRequests: allRequests?.length || 0,
        pendingWithNullMechanic: pendingRequests?.length || 0,
        expiredRequests: expiredRequests?.length || 0,
        shouldBeExpiredButArent: shouldBeExpired?.length || 0,
        stuckRequests: stuckRequests.length,
        statusBreakdown: statusCounts,
      },
      allRequests: allRequests || [],
      pendingRequests: pendingRequests || [],
      expiredRequests: expiredRequests || [],
      shouldBeExpired: shouldBeExpired || [],
      stuckRequests: stuckRequests,
      currentTime: now,
    })
  } catch (error) {
    console.error('Unexpected error in debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
