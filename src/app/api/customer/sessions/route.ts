import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/customer/sessions
 * Fetch all sessions for the authenticated customer
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} fetching sessions`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch all sessions for this customer (including fields needed for SessionCompletionModal)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        started_at,
        ended_at,
        customer_user_id,
        mechanic_id,
        rating,
        metadata
      `)
      .eq('customer_user_id', customer.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Get mechanic names for sessions that have mechanics assigned (using mechanic_id directly)
    const mechanicIds = sessions?.map(s => s.mechanic_id).filter(Boolean) || []
    const { data: mechanics } = await supabaseAdmin
      .from('mechanics')
      .select('id, name')
      .in('id', mechanicIds)

    // Map mechanic names by mechanic_id
    const mechanicsMap = new Map(mechanics?.map(m => [m.id, m.name]) || [])

    // Format sessions with all fields needed for SessionCompletionModal
    const formattedSessions = sessions?.map(session => {
      const mechanicName = session.mechanic_id ? mechanicsMap.get(session.mechanic_id) : null

      // Determine price based on plan (in cents for SessionCompletionModal)
      const priceMap: Record<string, number> = {
        free: 0,
        trial: 0,
        quick: 999,        // $9.99 in cents
        chat10: 999,
        standard: 2999,    // $29.99 in cents
        video15: 2999,
        diagnostic: 4999,  // $49.99 in cents
      }

      // Calculate duration in minutes if session has started and ended
      let durationMinutes = null
      if (session.started_at && session.ended_at) {
        const startTime = new Date(session.started_at).getTime()
        const endTime = new Date(session.ended_at).getTime()
        durationMinutes = Math.round((endTime - startTime) / 60000)
      }

      return {
        id: session.id,
        type: session.type,
        status: session.status,
        customer_user_id: session.customer_user_id,
        mechanic_id: session.mechanic_id,
        customer_name: customer.user_metadata?.full_name || customer.email,
        mechanic_name: mechanicName || 'Waiting for assignment',
        plan: session.plan || 'free',
        created_at: session.created_at,
        started_at: session.started_at,
        ended_at: session.ended_at,
        completed_at: session.ended_at, // Keep for backward compatibility
        duration_minutes: durationMinutes,
        base_price: priceMap[session.plan || 'free'] || 0,
        price: (priceMap[session.plan || 'free'] || 0) / 100, // Keep for backward compatibility (in dollars)
        rating: session.rating,
      }
    }) || []

    return NextResponse.json({
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * NOTE: Session creation has been consolidated to /api/intake/start
 * POST endpoint removed to prevent confusion and maintain single source of truth
 * All session creation (free and paid) should use /api/intake/start
 */

export const dynamic = 'force-dynamic'
