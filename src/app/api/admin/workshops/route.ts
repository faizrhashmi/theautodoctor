/**
 * GET /api/admin/workshops
 * Fetch all workshops with statistics for admin management
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = getSupabaseServer()

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check here when admin_users table is ready
    // For now, assume authenticated user is admin

    // Fetch all workshops with aggregated statistics
    const { data: workshops, error: workshopsError } = await supabase
      .from('workshops')
      .select(`
        id,
        name,
        business_name,
        email,
        phone,
        address,
        city,
        state_province,
        country,
        status,
        revenue_share_percentage,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (workshopsError) {
      console.error('[Admin Workshops GET] Error fetching workshops:', workshopsError)
      return NextResponse.json(
        { error: 'Failed to fetch workshops' },
        { status: 500 }
      )
    }

    // Fetch aggregated statistics for each workshop
    const workshopsWithStats = await Promise.all(
      (workshops || []).map(async (workshop) => {
        // Count mechanics
        const { count: mechanicCount } = await supabase
          .from('workshop_mechanics')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', workshop.id)
          .eq('status', 'active')

        // Get total sessions (from workshop_metrics)
        const { data: metrics } = await supabase
          .from('workshop_metrics')
          .select('total_sessions, total_revenue_cents')
          .eq('workshop_id', workshop.id)
          .single()

        return {
          ...workshop,
          mechanic_count: mechanicCount || 0,
          total_sessions: metrics?.total_sessions || 0,
          total_revenue: metrics?.total_revenue_cents ? metrics.total_revenue_cents / 100 : 0
        }
      })
    )

    return NextResponse.json({
      workshops: workshopsWithStats,
      total: workshopsWithStats.length
    })
  } catch (error: any) {
    console.error('[Admin Workshops GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
