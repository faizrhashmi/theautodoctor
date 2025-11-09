/**
 * GET /api/admin/workshops/:id
 * Fetch detailed information about a specific workshop
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const workshopId = params.id

    // Fetch workshop details
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        country,
        status,
        stripe_account_id,
        stripe_charges_enabled,
        stripe_payouts_enabled,
        created_at,
        updated_at
      `)
      .eq('id', workshopId)
      .eq('organization_type', 'workshop')
      .single()

    if (workshopError || !workshop) {
      console.error('[Admin Workshop Detail GET] Error:', workshopError)
      return NextResponse.json(
        { error: 'Workshop not found' },
        { status: 404 }
      )
    }

    // Fetch aggregated statistics
    // Count mechanics affiliated with this workshop
    const { count: mechanicCount } = await supabaseAdmin
      .from('mechanics')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshop.id)

    // Count sessions for this workshop
    const { count: sessionCount } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshop.id)

    // Calculate total revenue (placeholder - implement when payment tracking is ready)
    const totalRevenue = 0

    const workshopWithStats = {
      ...workshop,
      mechanic_count: mechanicCount || 0,
      total_sessions: sessionCount || 0,
      total_revenue: totalRevenue
    }

    return NextResponse.json({ workshop: workshopWithStats })
  } catch (error: unknown) {
    console.error('[Admin Workshop Detail GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
