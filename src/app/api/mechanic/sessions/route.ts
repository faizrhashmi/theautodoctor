import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(req)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    console.log(`[MECHANIC SESSIONS] ${mechanic.email} (${mechanic.id}) fetching sessions`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // CRITICAL FIX: sessions.mechanic_id references auth.users(id) directly (Supabase Auth)
    // No need to look up mechanics table - query by Supabase Auth user ID
    console.log('[MECHANIC SESSIONS] Querying sessions where mechanic_id =', mechanic.id)

    // Fetch all sessions for this mechanic (using Supabase Auth user ID directly)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        ended_at,
        metadata,
        customer_user_id,
        mechanic_id
      `)
      .eq('mechanic_id', mechanic.id)  // Use Supabase Auth user ID directly
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Get customer names for sessions
    const customerIds = sessions?.map(s => s.customer_user_id).filter(Boolean) || []
    const { data: customers } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', customerIds)

    // Map customer names to sessions
    const customersMap = new Map(customers?.map(c => [c.id, c.full_name]) || [])

    // Determine price based on plan
    const priceMap: Record<string, number> = {
      free: 0,
      trial: 0,
      quick: 9.99,
      chat10: 9.99,
      standard: 29.99,
      video15: 29.99,
      diagnostic: 49.99,
    }

    // Format sessions with customer names and pricing
    const formattedSessions = sessions?.map(session => {
      const customerName = customersMap.get(session.customer_user_id) || 'Unknown Customer'

      return {
        id: session.id,
        type: session.type,
        status: session.status,
        customer_name: customerName,
        plan: session.plan || 'free',
        created_at: session.created_at,
        completed_at: session.ended_at,
        price: priceMap[session.plan || 'free'] || 0,
        metadata: session.metadata,
      }
    }) || []

    console.log('[MECHANIC SESSIONS] Returning sessions:', {
      count: formattedSessions.length,
      mechanicAuthId: mechanic.id,
      sessionIds: formattedSessions.map(s => s.id).slice(0, 3)
    })

    return NextResponse.json({
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
