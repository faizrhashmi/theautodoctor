/**
 * GET /api/admin/workshops
 * Fetch all workshops with statistics for admin management
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    // Fetch all workshops from organizations table
    const { data: workshops, error: workshopsError } = await supabaseAdmin
      .from('organizations')
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
      .eq('organization_type', 'workshop')
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
        // Count mechanics affiliated with this workshop
        const { count: mechanicCount } = await supabaseAdmin
          .from('mechanics')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', workshop.id)

        // Count sessions for this workshop (if tracking exists)
        const { count: sessionCount } = await supabaseAdmin
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', workshop.id)

        return {
          ...workshop,
          mechanic_count: mechanicCount || 0,
          total_sessions: sessionCount || 0,
          total_revenue: 0 // TODO: Calculate from payments when implemented
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
