import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/dashboard/stats
 * Returns real-time platform statistics for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data
    console.log(`[ADMIN] ${admin.email} accessing dashboard stats`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString()

    // Fetch all stats in parallel for performance
    const [
      totalUsersResult,
      activeSessionsResult,
      pendingClaimsResult,
      todayRevenueResult,
      totalSessionsResult,
      totalMechanicsResult,
      onlineMechanicsResult,
      pendingIntakesResult,
      todaySessionsResult,
      weekSessionsResult,
    ] = await Promise.all([
      // Total users count
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // Active sessions (live, waiting, scheduled)
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['live', 'waiting', 'scheduled']),

      // Pending claims (if claims table exists)
      supabaseAdmin
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'claim')
        .eq('status', 'pending')
        .then(res => res).catch(() => ({ count: 0 })),

      // Today's revenue from payments
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', todayISO)
        .lt('created_at', tomorrowISO)
        .then(res => res).catch(() => ({ data: [] })),

      // Total sessions ever
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true }),

      // Total mechanics
      supabaseAdmin
        .from('mechanics')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),

      // Online mechanics right now
      supabaseAdmin
        .from('mechanics')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)
        .eq('can_accept_sessions', true),

      // Pending intakes
      supabaseAdmin
        .from('intakes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Today's sessions
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO)
        .lt('created_at', tomorrowISO),

      // Last 7 days sessions
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Calculate revenue today
    const revenueToday = (todayRevenueResult.data || [])
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100 // Convert cents to dollars

    // Calculate average session value
    const avgSessionValue = totalSessionsResult.count && totalSessionsResult.count > 0
      ? revenueToday / (todaySessionsResult.count || 1)
      : 0

    // Build response
    const stats = {
      // Main KPIs
      totalUsers: totalUsersResult.count || 0,
      activeSessions: activeSessionsResult.count || 0,
      pendingClaims: pendingClaimsResult.count || 0,
      revenueToday: revenueToday,

      // Additional metrics
      totalSessions: totalSessionsResult.count || 0,
      todaySessions: todaySessionsResult.count || 0,
      weekSessions: weekSessionsResult.count || 0,

      // Mechanic metrics
      totalMechanics: totalMechanicsResult.count || 0,
      onlineMechanics: onlineMechanicsResult.count || 0,

      // Queue metrics
      pendingIntakes: pendingIntakesResult.count || 0,

      // Calculated metrics
      avgSessionValue: parseFloat(avgSessionValue.toFixed(2)),
      mechanicAvailability: totalMechanicsResult.count && totalMechanicsResult.count > 0
        ? parseFloat(((onlineMechanicsResult.count || 0) / totalMechanicsResult.count * 100).toFixed(1))
        : 0,

      // Timestamp
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(stats)
  } catch (error: unknown) {
    console.error('[ADMIN DASHBOARD] Error fetching stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard statistics',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
