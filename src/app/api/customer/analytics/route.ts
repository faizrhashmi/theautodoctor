import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  getCustomerSpendingTrend,
  getCustomerSessionDistribution,
  type CustomerSpendingTrendRow,
  type CustomerSessionDistributionRow
} from '@/types/database-functions'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} fetching analytics`)

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    const customerId = customer.id

    // Fetch customer analytics from materialized view
    const { data: customerAnalytics } = await supabaseAdmin
      .from('customer_analytics')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    // ✅ P0 FIX: Use type-safe RPC wrappers
    // Fetch spending trend (last 12 months)
    const spendingTrend = await getCustomerSpendingTrend(supabaseAdmin, customerId)

    // Fetch session distribution
    const sessionDistribution = await getCustomerSessionDistribution(supabaseAdmin, customerId)

    // Fetch top rated mechanics for this customer
    const { data: mechanicRatings } = await supabaseAdmin
      .from('sessions')
      .select(`
        mechanic:profiles!sessions_mechanic_user_id_fkey (
          id,
          full_name,
          specialties
        ),
        session_reviews (
          rating
        )
      `)
      .eq('customer_user_id', customerId)
      .eq('status', 'completed')
      .not('mechanic_user_id', 'is', null)
      .limit(20)

    // Aggregate mechanic data
    const mechanicMap = new Map()
    mechanicRatings?.forEach((session: any) => {
      if (session.mechanic && session.mechanic.id) {
        const mechId = session.mechanic.id
        if (!mechanicMap.has(mechId)) {
          mechanicMap.set(mechId, {
            id: mechId,
            name: session.mechanic.full_name,
            specialization: session.mechanic.specialties?.[0] || 'General',
            sessions: 0,
            totalRating: 0,
            ratingCount: 0,
          })
        }
        const mech = mechanicMap.get(mechId)
        mech.sessions++
        if (session.session_reviews?.[0]?.rating) {
          mech.totalRating += session.session_reviews[0].rating
          mech.ratingCount++
        }
      }
    })

    const topMechanics = Array.from(mechanicMap.values())
      .map((m) => ({
        id: m.id,
        name: m.name,
        rating: m.ratingCount > 0 ? Number((m.totalRating / m.ratingCount).toFixed(1)) : 0,
        sessions: m.sessions,
        specialization: m.specialization,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5)

    // Format spending trend with trend indicators
    // ✅ P0 FIX: Now has full type safety - no 'any' types!
    const monthlySpending = spendingTrend.map((item, index, arr) => {
        const prevAmount = index < arr.length - 1 ? parseFloat(arr[index + 1].total_spent) : 0
        const currentAmount = parseFloat(item.total_spent)
        const change = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0

        return {
          month: new Date(item.month + '-01').toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          amount: currentAmount,
          trend: change > 0 ? ('up' as const) : change < 0 ? ('down' as const) : ('stable' as const),
          change: Math.abs(Math.round(change)),
        }
      })

    // Format session distribution with colors
    const colorMap: Record<string, string> = {
      chat: '#3B82F6',
      video: '#10B981',
      diagnostic: '#F59E0B',
    }

    // ✅ P0 FIX: Type-safe mapping with autocomplete
    const serviceDistribution = sessionDistribution.map((item) => ({
        type: item.session_type.charAt(0).toUpperCase() + item.session_type.slice(1),
        count: item.count,
        percentage: Math.round(parseFloat(item.percentage)),
        color: colorMap[item.session_type] || '#8B5CF6',
      }))

    // Vehicle stats
    const vehicleStats = {
      total_vehicles: customerAnalytics?.total_vehicles || 0,
      most_serviced: 'N/A', // TODO: Calculate from sessions
      average_mileage: 0, // TODO: Calculate from vehicles
    }

    const analyticsData = {
      monthlySpending,
      serviceDistribution,
      mechanicRatings: topMechanics,
      vehicleStats,
      summary: {
        total_sessions: customerAnalytics?.total_sessions || 0,
        completed_sessions: customerAnalytics?.completed_sessions || 0,
        total_spent: customerAnalytics?.total_spent || 0,
        avg_session_cost: customerAnalytics?.avg_session_cost || 0,
        engagement_score: customerAnalytics?.engagement_score || 0,
        current_credits: customerAnalytics?.current_credits || 0,
      },
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('[CUSTOMER ANALYTICS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}