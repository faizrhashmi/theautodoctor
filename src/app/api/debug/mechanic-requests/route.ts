import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function getMechanicFromCookie(_req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function GET(req: NextRequest) {
  const mechanic = await getMechanicFromCookie(req)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized - No mechanic found' }, { status: 401 })
  }

  console.log('[DEBUG] Mechanic ID:', mechanic.id, 'Email:', mechanic.email)

  try {
    // 1. Get ALL session requests (no filters)
    const { data: allRequests, error: allError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) throw allError

    console.log('[DEBUG] Total requests in database:', allRequests?.length || 0)

    // 2. Get pending requests (should show on dashboard)
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: false })

    if (pendingError) throw pendingError

    console.log('[DEBUG] Pending requests (should show):', pendingRequests?.length || 0)

    // 3. Get this mechanic's accepted requests
    const { data: acceptedRequests, error: acceptedError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'accepted')
      .eq('mechanic_id', mechanic.id)
      .order('created_at', { ascending: false })

    if (acceptedError) throw acceptedError

    console.log('[DEBUG] Accepted requests for this mechanic:', acceptedRequests?.length || 0)

    // 4. Get all sessions
    const { data: allSessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (sessionsError) throw sessionsError

    // 5. Analyze request states
    const requestsByStatus = {
      pending: allRequests?.filter(r => r.status === 'pending') || [],
      accepted: allRequests?.filter(r => r.status === 'accepted') || [],
      cancelled: allRequests?.filter(r => r.status === 'cancelled') || [],
      other: allRequests?.filter(r => !['pending', 'accepted', 'cancelled'].includes(r.status)) || [],
    }

    // 7. Check for requests with mechanic_id but status pending (bad state)
    const badStateRequests = allRequests?.filter(r => r.status === 'pending' && r.mechanic_id !== null) || []

    // 8. Check for old pending requests (might be stuck)
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oldPendingRequests = pendingRequests?.filter(r => new Date(r.created_at) < oneDayAgo) || []

    return NextResponse.json({
      debug: true,
      timestamp: now.toISOString(),
      mechanic: {
        id: mechanic.id,
        email: mechanic.email,
        name: mechanic.name,
      },
      summary: {
        totalRequests: allRequests?.length || 0,
        pendingRequests: pendingRequests?.length || 0,
        acceptedByThisMechanic: acceptedRequests?.length || 0,
        totalSessions: allSessions?.length || 0,
        badStateRequests: badStateRequests.length,
        oldPendingRequests: oldPendingRequests.length,
      },
      breakdown: {
        byStatus: {
          pending: requestsByStatus.pending.length,
          accepted: requestsByStatus.accepted.length,
          cancelled: requestsByStatus.cancelled.length,
          other: requestsByStatus.other.length,
        },
      },
      issues: {
        badStateRequests: badStateRequests.map(r => ({
          id: r.id,
          status: r.status,
          mechanic_id: r.mechanic_id,
          created_at: r.created_at,
          issue: 'Status is pending but has mechanic_id assigned',
        })),
        oldPendingRequests: oldPendingRequests.map(r => ({
          id: r.id,
          customer_name: r.customer_name,
          created_at: r.created_at,
          age_hours: Math.floor((now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)),
          issue: 'Pending for more than 24 hours - might be stuck',
        })),
      },
      data: {
        allRequests: allRequests?.slice(0, 10), // First 10 only
        pendingRequests: pendingRequests?.slice(0, 10),
        acceptedRequests: acceptedRequests?.slice(0, 10),
        recentSessions: allSessions?.slice(0, 10),
      },
      queryInfo: {
        pendingQuery: {
          description: 'Query used for dashboard incoming requests',
          conditions: [
            'status = pending',
            'mechanic_id IS NULL',
            'ORDER BY created_at ASC',
          ],
        },
        acceptedQuery: {
          description: 'Query used for accepted requests section',
          conditions: [
            'status = accepted',
            `mechanic_id = ${mechanic.id}`,
            'ORDER BY created_at ASC',
          ],
        },
      },
    })
  } catch (error: any) {
    console.error('[DEBUG] Error fetching debug data:', error)
    return NextResponse.json({
      error: 'Debug fetch failed',
      message: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
