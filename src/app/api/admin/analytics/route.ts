import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Fetch platform-wide analytics for admins
 * Query params:
 *   - period: 'today' | 'week' | 'month' | 'year' | 'custom'
 *   - start_date: ISO date string (for custom period)
 *   - end_date: ISO date string (for custom period)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const { supabaseAdmin } = authResult

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date range
    let startDate: Date
    let endDate = new Date()

    switch (period) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'year':
        startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      case 'custom':
        const customStart = searchParams.get('start_date')
        const customEnd = searchParams.get('end_date')
        if (!customStart || !customEnd) {
          return NextResponse.json({ error: 'start_date and end_date required for custom period' }, { status: 400 })
        }
        startDate = new Date(customStart)
        endDate = new Date(customEnd)
        break
      default:
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
    }

    // Fetch platform KPIs
    const { data: kpis, error: kpisError } = await supabaseAdmin.rpc('get_platform_kpis', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    })

    if (kpisError) {
      console.error('[API] Error fetching platform KPIs:', kpisError)
      return NextResponse.json(
        { error: 'Failed to fetch KPIs', details: kpisError.message },
        { status: 500 }
      )
    }

    // Fetch daily platform analytics
    const { data: dailyAnalytics, error: dailyError } = await supabaseAdmin
      .from('platform_analytics')
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false })
      .limit(90)

    if (dailyError) {
      console.error('[API] Error fetching daily analytics:', dailyError)
    }

    // Fetch top performing mechanics
    const { data: topMechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanic_analytics')
      .select('mechanic_id, mechanic_name, total_revenue, avg_rating, completed_sessions, performance_score')
      .order('performance_score', { ascending: false })
      .limit(10)

    if (mechanicsError) {
      console.error('[API] Error fetching top mechanics:', mechanicsError)
    }

    // Fetch customer engagement stats
    const { data: topCustomers, error: customersError } = await supabaseAdmin
      .from('customer_analytics')
      .select('customer_id, customer_name, total_spent, total_sessions, engagement_score')
      .order('engagement_score', { ascending: false })
      .limit(10)

    if (customersError) {
      console.error('[API] Error fetching top customers:', customersError)
    }

    // Calculate growth metrics
    const prevPeriodStart = new Date(startDate)
    prevPeriodStart.setTime(
      prevPeriodStart.getTime() - (endDate.getTime() - startDate.getTime())
    )

    const { data: prevKpis } = await supabaseAdmin.rpc('get_platform_kpis', {
      p_start_date: prevPeriodStart.toISOString(),
      p_end_date: startDate.toISOString(),
    })

    const currentKpi = kpis?.[0] || {}
    const previousKpi = prevKpis?.[0] || {}

    const growth = {
      revenue: previousKpi.total_revenue
        ? ((currentKpi.total_revenue - previousKpi.total_revenue) / previousKpi.total_revenue) * 100
        : 0,
      sessions: previousKpi.total_sessions
        ? ((currentKpi.total_sessions - previousKpi.total_sessions) / previousKpi.total_sessions) * 100
        : 0,
      customers: previousKpi.new_customers
        ? ((currentKpi.new_customers - previousKpi.new_customers) / previousKpi.new_customers) * 100
        : 0,
    }

    return NextResponse.json({
      kpis: currentKpi,
      growth: {
        revenue: Math.round(growth.revenue * 10) / 10,
        sessions: Math.round(growth.sessions * 10) / 10,
        customers: Math.round(growth.customers * 10) / 10,
      },
      daily_analytics: dailyAnalytics || [],
      top_mechanics: topMechanics || [],
      top_customers: topCustomers || [],
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: period,
      },
    })
  } catch (error: unknown) {
    console.error('[API] Error in admin analytics:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/analytics/refresh
 * Manually refresh all analytics materialized views
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const { supabaseAdmin } = authResult

  try {
    const { error: refreshError } = await supabaseAdmin.rpc('refresh_all_analytics')

    if (refreshError) {
      console.error('[API] Error refreshing analytics:', refreshError)
      return NextResponse.json(
        { error: 'Failed to refresh analytics', details: refreshError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics refreshed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[API] Error refreshing analytics:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
