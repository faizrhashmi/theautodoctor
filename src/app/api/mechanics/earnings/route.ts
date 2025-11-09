import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { WORKSHOP_PRICING } from '@/config/workshopPricing'
import { getMechanicType, MechanicType } from '@/types/mechanic'

/**
 * GET /api/mechanics/earnings
 *
 * Get detailed earnings breakdown
 * Query params:
 *   - period: 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
 *   - start_date: ISO date string (optional)
 *   - end_date: ISO date string (optional)
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  // ✅ CRITICAL: Block workshop employees from accessing earnings
  // Workshop employees are paid by their workshop, not directly by platform
  const mechanicType = getMechanicType(mechanic)
  if (mechanicType === MechanicType.WORKSHOP_AFFILIATED) {
    return NextResponse.json({
      error: 'Workshop employees cannot access earnings. Contact your workshop admin for payment details.',
      code: 'WORKSHOP_EMPLOYEE_RESTRICTION'
    }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    const mechanicId = mechanic.id

    // Get query params
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Calculate date range
    let dateFilter: Date
    const now = new Date()

    if (startDate && endDate) {
      dateFilter = new Date(startDate)
    } else {
      switch (period) {
        case 'day':
          dateFilter = new Date()
          dateFilter.setHours(0, 0, 0, 0)
          break
        case 'week':
          dateFilter = new Date()
          dateFilter.setDate(dateFilter.getDate() - dateFilter.getDay())
          dateFilter.setHours(0, 0, 0, 0)
          break
        case 'month':
          dateFilter = new Date()
          dateFilter.setDate(1)
          dateFilter.setHours(0, 0, 0, 0)
          break
        case 'year':
          dateFilter = new Date()
          dateFilter.setMonth(0, 1)
          dateFilter.setHours(0, 0, 0, 0)
          break
        case 'all':
        default:
          dateFilter = new Date(0) // Beginning of time
          break
      }
    }

    // Get all completed sessions
    let query = supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        session_type,
        status,
        base_price,
        total_price,
        created_at,
        updated_at,
        profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name
        )
      `)
      .eq('mechanic_id', mechanicId)
      .eq('status', 'completed')
      .gte('updated_at', dateFilter.toISOString())

    if (endDate) {
      query = query.lte('updated_at', endDate)
    }

    const { data: sessions, error: sessionsError } = await query.order('updated_at', { ascending: false })

    if (sessionsError) {
      console.error('[EARNINGS API] Sessions error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
    }

    // Calculate earnings breakdown
    const platformFeeRate = WORKSHOP_PRICING.PLATFORM_COMMISSION_RATE / 100 // Convert percentage to decimal
    let totalRevenue = 0
    let totalPlatformFee = 0
    let totalEarnings = 0

    const bySessionType: Record<string, { count: number; revenue: number; earnings: number }> = {
      chat: { count: 0, revenue: 0, earnings: 0 },
      video: { count: 0, revenue: 0, earnings: 0 },
      upgraded_from_chat: { count: 0, revenue: 0, earnings: 0 }
    }

    const dailyEarnings: Record<string, number> = {}
    const sessionDetails = []

    for (const session of sessions || []) {
      const revenue = session.total_price
      const platformFee = revenue * platformFeeRate
      const earnings = revenue - platformFee

      totalRevenue += revenue
      totalPlatformFee += platformFee
      totalEarnings += earnings

      // By session type
      if (bySessionType[session.session_type]) {
        bySessionType[session.session_type].count++
        bySessionType[session.session_type].revenue += revenue
        bySessionType[session.session_type].earnings += earnings
      }

      // Daily breakdown
      const date = new Date(session.updated_at).toISOString().split('T')[0]
      if (!dailyEarnings[date]) {
        dailyEarnings[date] = 0
      }
      dailyEarnings[date] += earnings

      // Session details
      sessionDetails.push({
        id: session.id,
        customer_name: (session.profiles as any)?.full_name || 'Unknown Customer',
        session_type: session.session_type,
        date: session.updated_at,
        revenue: revenue,
        platform_fee: platformFee,
        earnings: earnings
      })
    }

    // Convert daily earnings to array
    const dailyEarningsArray = Object.entries(dailyEarnings)
      .map(([date, earnings]) => ({ date, earnings }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      period: period,
      date_range: {
        start: dateFilter.toISOString(),
        end: endDate || now.toISOString()
      },
      summary: {
        total_sessions: sessions?.length || 0,
        total_revenue: totalRevenue,
        total_platform_fee: totalPlatformFee,
        total_earnings: totalEarnings,
        platform_fee_rate: platformFeeRate
      },
      by_session_type: bySessionType,
      daily_earnings: dailyEarningsArray,
      session_details: sessionDetails
    })

  } catch (error) {
    console.error('[EARNINGS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
