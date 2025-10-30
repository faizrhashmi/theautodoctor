import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

// ✅ Force dynamic rendering - this route uses cookies for authentication
export const dynamic = 'force-dynamic'

/**
 * GET /api/mechanic/dashboard/stats
 *
 * Get dashboard statistics for authenticated mechanic (workshop-affiliated)
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const mechanicId = mechanic.id

    // Get pending sessions count (sessions waiting to be started)
    const { count: pendingSessions } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .in('status', ['pending', 'waiting', 'scheduled'])

    // Get active quotes count (quotes sent but not yet responded to)
    const { count: activeQuotes } = await supabaseAdmin
      .from('repair_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'pending')

    // Get today's approved quotes
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const { count: approvedToday } = await supabaseAdmin
      .from('repair_quotes')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'accepted')
      .gte('customer_response_at', todayISO)

    // Calculate revenue this month
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)
    const firstDayISO = firstDayOfMonth.toISOString()

    // Get completed sessions this month
    const { data: completedSessions } = await supabaseAdmin
      .from('sessions')
      .select('plan')
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('ended_at', firstDayISO)

    // Calculate revenue from completed sessions (70% mechanic share)
    const MECHANIC_SHARE = 0.7
    const PLAN_PRICING: Record<string, number> = {
      'chat10': 999,      // $9.99
      'video15': 2999,    // $29.99
      'diagnostic': 4999, // $49.99
    }

    const revenueThisMonth = completedSessions?.reduce((total, session) => {
      const planPrice = PLAN_PRICING[session.plan] || 0
      return total + (planPrice * MECHANIC_SHARE)
    }, 0) || 0

    // Convert from cents to dollars
    const revenueInDollars = revenueThisMonth / 100

    // Get total completed sessions (all time)
    const { count: totalCompletedSessions } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')

    // Get recent sessions
    const { data: recentSessions } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        ended_at,
        profiles:customer_user_id (
          full_name
        )
      `)
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false })
      .limit(5)

    const formattedRecentSessions = recentSessions?.map(s => ({
      id: s.id,
      customer_name: s.profiles?.full_name || 'Customer',
      session_type: s.type,
      status: s.status,
      plan: s.plan,
      created_at: s.created_at,
      ended_at: s.ended_at
    })) || []

    const response = NextResponse.json({
      stats: {
        pending_sessions: pendingSessions || 0,
        active_quotes: activeQuotes || 0,
        approved_today: approvedToday || 0,
        revenue_this_month: revenueInDollars,
        total_completed_sessions: totalCompletedSessions || 0,
      },
      recent_sessions: formattedRecentSessions
    })

    // Add cache headers - short-lived cache for dashboard stats (15 seconds)
    // This reduces database load while keeping data reasonably fresh
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')

    return response

  } catch (error) {
    console.error('[MECHANIC DASHBOARD STATS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
