// app/api/admin/mechanics/specialists/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/admin/mechanics/specialists
 *
 * Fetch all mechanics with specialist status (brand/master)
 * Supports filtering by tier, account type, workshop, brands
 *
 * Query params:
 * - search: string (name, email, or brand)
 * - tier: 'brand' | 'master'
 * - accountType: 'individual_mechanic' | 'workshop_mechanic'
 * - approvalStatus: 'approved' | 'pending'
 * - workshop: workshop UUID
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tier = searchParams.get('tier')
    const accountType = searchParams.get('accountType')
    const approvalStatus = searchParams.get('approvalStatus')
    const workshop = searchParams.get('workshop')

    // Build query - fetch all specialists (not general mechanics)
    let query = supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        account_type,
        is_brand_specialist,
        brand_specializations,
        specialist_tier,
        workshop_id,
        rating,
        completed_sessions,
        created_at,
        specialist_approved_at,
        specialist_approved_by,
        workshops:workshop_id (
          id,
          name
        )
      `)
      .eq('is_brand_specialist', true)
      .order('created_at', { ascending: false })

    // Apply filters
    if (tier) {
      query = query.eq('specialist_tier', tier)
    }

    if (accountType) {
      query = query.eq('account_type', accountType)
    }

    if (workshop) {
      query = query.eq('workshop_id', workshop)
    }

    if (approvalStatus === 'approved') {
      query = query.not('specialist_approved_at', 'is', null)
    } else if (approvalStatus === 'pending') {
      query = query.is('specialist_approved_at', null)
    }

    // Execute query
    const { data: specialists, error } = await query

    if (error) {
      console.error('[Admin Specialists] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch specialists' },
        { status: 500 }
      )
    }

    // Transform data to flatten workshop relationship
    let transformedSpecialists = (specialists || []).map((m: any) => ({
      id: m.id,
      name: m.name || 'Unnamed Mechanic',
      email: m.email,
      account_type: m.account_type,
      is_brand_specialist: m.is_brand_specialist,
      brand_specializations: m.brand_specializations || [],
      specialist_tier: m.specialist_tier,
      workshop_id: m.workshop_id,
      workshop_name: m.workshops?.name || null,
      rating: m.rating || 0,
      completed_sessions: m.completed_sessions || 0,
      created_at: m.created_at,
      specialist_approved_at: m.specialist_approved_at,
      specialist_approved_by: m.specialist_approved_by
    }))

    // Apply search filter (name, email, or brand)
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase()
      transformedSpecialists = transformedSpecialists.filter((s: any) =>
        s.name.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower) ||
        s.brand_specializations.some((b: string) => b.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({
      specialists: transformedSpecialists,
      count: transformedSpecialists.length
    })

  } catch (error: any) {
    console.error('[Admin Specialists] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
