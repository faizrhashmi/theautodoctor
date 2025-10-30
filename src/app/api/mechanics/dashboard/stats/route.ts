import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanics/dashboard/stats
 *
 * Get dashboard statistics for mechanic
 * UPDATED: Uses unified Supabase Auth via requireMechanicAPI
 */
export async function GET(req: NextRequest) {
  // ✅ Use unified auth guard
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) {
    return authResult.error
  }

  const mechanic = authResult.data
  const mechanicId = mechanic.id

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Get pending sessions count (for virtual-only mechanics)
    const { count: pendingSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*', { count: 'exact', head: true })
      .in('session_type', ['chat', 'video', 'upgraded_from_chat'])
      .eq('status', 'pending')
      .is('mechanic_id', null)

    // Get accepted sessions count
    const { count: acceptedSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'accepted')

    // Get today's completed sessions
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todaySessions, error: todayError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('updated_at', today.toISOString())

    const completedToday = todaySessions?.length || 0
    const earningsToday = todaySessions?.reduce((sum, s) => sum + (s.total_price * 0.85), 0) || 0

    // Get this week's earnings
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: weekSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('updated_at', weekStart.toISOString())

    const earningsWeek = weekSessions?.reduce((sum, s) => sum + (s.total_price * 0.85), 0) || 0

    // Get this month's earnings
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: monthSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('updated_at', monthStart.toISOString())

    const earningsMonth = monthSessions?.reduce((sum, s) => sum + (s.total_price * 0.85), 0) || 0

    // Get total sessions
    const { count: totalSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')

    // Get average rating (if available)
    // Note: Rating system would be implemented in a future phase
    const averageRating = 0

    // Get recent sessions
    const { data: recentSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        session_type,
        status,
        total_price,
        created_at,
        profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name
        )
      `)
      .eq('mechanic_id', mechanicId)
      .in('status', ['completed', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(10)

    const formattedRecentSessions = recentSessions?.map(s => ({
      id: s.id,
      customer_name: (s.profiles as any)?.full_name || 'Unknown Customer',
      session_type: s.session_type,
      status: s.status,
      earnings: s.total_price * 0.85,
      created_at: s.created_at
    })) || []

    return NextResponse.json({
      stats: {
        pending_sessions: pendingSessions || 0,
        accepted_sessions: acceptedSessions || 0,
        completed_today: completedToday,
        earnings_today: earningsToday,
        earnings_week: earningsWeek,
        earnings_month: earningsMonth,
        total_sessions: totalSessions || 0,
        average_rating: averageRating
      },
      recent_sessions: formattedRecentSessions
    })

  } catch (error) {
    console.error('[DASHBOARD STATS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
