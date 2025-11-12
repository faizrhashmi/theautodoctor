/**
 * GET /api/mechanic/scheduled-sessions
 * Get upcoming scheduled sessions for the authenticated mechanic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get mechanic's upcoming scheduled sessions
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        scheduled_for,
        scheduled_start,
        type,
        waiver_signed_at,
        customer:profiles!customer_user_id(full_name, email),
        intake:intakes(concern_description, vehicle_id)
      `)
      .eq('mechanic_user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_for', twentyFourHoursAgo.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (sessionsError) {
      console.error('[mechanic/scheduled-sessions] Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // 3. Transform data for frontend
    const transformedSessions = (sessions || []).map((session: any) => ({
      id: session.id,
      customer_name: session.customer?.full_name || 'Customer',
      customer_email: session.customer?.email || '',
      scheduled_for: session.scheduled_for,
      type: session.type,
      waiver_signed_at: session.waiver_signed_at,
      concern_description: session.intake?.concern_description || null,
      vehicle_info: null // Could fetch vehicle details if needed
    }))

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
      count: transformedSessions.length
    })

  } catch (error: any) {
    console.error('[mechanic/scheduled-sessions] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
