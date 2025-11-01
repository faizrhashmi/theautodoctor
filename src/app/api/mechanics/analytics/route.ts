import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { WORKSHOP_PRICING } from '@/config/workshopPricing'

/**
 * GET /api/mechanics/analytics
 *
 * Get comprehensive business analytics
 * Query params:
 *   - period: 'week' | 'month' | 'quarter' | 'year' (default: 'month')
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

    // Query params
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    // Get virtual sessions
    const { data: virtualSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price, session_type, updated_at')
      .eq('mechanic_id', mechanic.id)
      .eq('status', 'completed')
      .gte('updated_at', startDate.toISOString())

    const virtualRevenue = virtualSessions?.reduce((sum, s) => sum + s.total_price, 0) || 0
    const mechanicShareRate = 1 - (WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE / 100) // 0.85 (85%)
    const virtualEarnings = virtualRevenue * mechanicShareRate
    const virtualJobsCount = virtualSessions?.length || 0

    // Get physical jobs
    const { data: physicalJobs } = await supabaseAdmin
      .from('partnership_revenue_splits')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .gte('completed_at', startDate.toISOString())

    const physicalRevenue = physicalJobs?.reduce((sum, j) => sum + j.total_revenue, 0) || 0
    const physicalEarnings = physicalJobs?.reduce((sum, j) => sum + j.mechanic_share, 0) || 0
    const physicalJobsCount = physicalJobs?.length || 0

    // Total metrics
    const totalJobs = virtualJobsCount + physicalJobsCount
    const totalRevenue = virtualRevenue + physicalRevenue
    const totalEarnings = virtualEarnings + physicalEarnings
    const avgRevenuePerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0

    // Revenue by session type
    const chatSessions = virtualSessions?.filter(s => s.session_type === 'chat') || []
    const videoSessions = virtualSessions?.filter(s => s.session_type === 'video' || s.session_type === 'upgraded_from_chat') || []

    // Daily breakdown
    const dailyData: Record<string, { jobs: number; revenue: number; earnings: number }> = {}

    virtualSessions?.forEach(session => {
      const date = session.updated_at.split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { jobs: 0, revenue: 0, earnings: 0 }
      }
      dailyData[date].jobs++
      dailyData[date].revenue += session.total_price
      dailyData[date].earnings += session.total_price * mechanicShareRate
    })

    physicalJobs?.forEach(job => {
      const date = job.completed_at.split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { jobs: 0, revenue: 0, earnings: 0 }
      }
      dailyData[date].jobs++
      dailyData[date].revenue += job.total_revenue
      dailyData[date].earnings += job.mechanic_share
    })

    const dailyBreakdown = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Client metrics
    const { count: totalClients } = await supabaseAdmin
      .from('mechanic_clients')
      .select('*', { count: 'exact', head: true })
      .eq('mechanic_id', mechanic.id)

    // Get clients with recent activity
    const { data: activeClients } = await supabaseAdmin
      .from('mechanic_clients')
      .select('customer_name, last_service_date, total_revenue')
      .eq('mechanic_id', mechanic.id)
      .gte('last_service_date', startDate.toISOString())

    // Top clients by revenue
    const { data: topClients } = await supabaseAdmin
      .from('mechanic_clients')
      .select('customer_name, total_revenue, total_jobs')
      .eq('mechanic_id', mechanic.id)
      .order('total_revenue', { ascending: false })
      .limit(5)

    // Growth metrics (compare to previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))

    const { data: previousVirtualSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price')
      .eq('mechanic_id', mechanic.id)
      .eq('status', 'completed')
      .gte('updated_at', previousPeriodStart.toISOString())
      .lt('updated_at', startDate.toISOString())

    const { data: previousPhysicalJobs } = await supabaseAdmin
      .from('partnership_revenue_splits')
      .select('total_revenue, mechanic_share')
      .eq('mechanic_id', mechanic.id)
      .gte('completed_at', previousPeriodStart.toISOString())
      .lt('completed_at', startDate.toISOString())

    const previousRevenue = (previousVirtualSessions?.reduce((sum, s) => sum + s.total_price, 0) || 0) +
      (previousPhysicalJobs?.reduce((sum, j) => sum + j.total_revenue, 0) || 0)

    const previousEarnings = (previousVirtualSessions?.reduce((sum, s) => sum + s.total_price * mechanicShareRate, 0) || 0) +
      (previousPhysicalJobs?.reduce((sum, j) => sum + j.mechanic_share, 0) || 0)

    const previousJobs = (previousVirtualSessions?.length || 0) + (previousPhysicalJobs?.length || 0)

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const earningsGrowth = previousEarnings > 0 ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0
    const jobsGrowth = previousJobs > 0 ? ((totalJobs - previousJobs) / previousJobs) * 100 : 0

    // Build analytics response (matching frontend interface)
    const analytics = {
      period: period,
      totalJobs: totalJobs,
      totalRevenue: totalRevenue,
      totalEarnings: totalEarnings,
      avgRevenuePerJob: avgRevenuePerJob,
      virtualJobs: {
        count: virtualJobsCount,
        revenue: virtualRevenue,
        earnings: virtualEarnings
      },
      physicalJobs: {
        count: physicalJobsCount,
        revenue: physicalRevenue,
        earnings: physicalEarnings
      },
      sessionTypes: {
        chat: {
          count: chatSessions.length,
          revenue: chatSessions.reduce((sum, s) => sum + s.total_price, 0)
        },
        video: {
          count: videoSessions.length,
          revenue: videoSessions.reduce((sum, s) => sum + s.total_price, 0)
        }
      },
      dailyData: dailyBreakdown,
      growth: {
        revenueGrowthPercentage: revenueGrowth,
        earningsGrowthPercentage: earningsGrowth,
        jobsGrowthPercentage: jobsGrowth
      },
      clients: {
        totalClients: totalClients || 0,
        activeThisPeriod: activeClients?.length || 0,
        topClients: topClients || []
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('[ANALYTICS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
