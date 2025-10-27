import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanics/partnerships/programs
 *
 * Browse available partnership programs
 * Query params:
 *   - program_type: 'bay_rental' | 'revenue_share' | 'membership'
 *   - city: string
 *   - province: string
 *   - limit: number (default: 20)
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Query params
    const { searchParams } = new URL(req.url)
    const programType = searchParams.get('program_type')
    const city = searchParams.get('city')
    const province = searchParams.get('province')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get active programs with workshop details
    let query = supabaseAdmin
      .from('workshop_partnership_programs')
      .select(`
        *,
        organizations!workshop_partnership_programs_workshop_id_fkey (
          id,
          name,
          address,
          city,
          province,
          postal_code,
          phone,
          email
        )
      `)
      .eq('is_active', true)

    if (programType) {
      query = query.eq('program_type', programType)
    }

    const { data: programs, error: programsError } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (programsError) {
      console.error('[BROWSE PROGRAMS API] Error:', programsError)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    // Filter by location if specified
    let filteredPrograms = programs || []

    if (city || province) {
      filteredPrograms = filteredPrograms.filter(program => {
        const workshop = program.organizations as any
        if (!workshop) return false

        if (city && workshop.city?.toLowerCase() !== city.toLowerCase()) {
          return false
        }

        if (province && workshop.province?.toLowerCase() !== province.toLowerCase()) {
          return false
        }

        return true
      })
    }

    // Check if mechanic has already applied to each program
    const programsWithStatus = await Promise.all(
      filteredPrograms.map(async (program) => {
        const { data: application } = await supabaseAdmin
          .from('partnership_applications')
          .select('id, status, created_at')
          .eq('program_id', program.id)
          .eq('mechanic_id', session.mechanic_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const { count: activeAgreementCount } = await supabaseAdmin
          .from('partnership_agreements')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)
          .eq('status', 'active')

        const spotsAvailable = program.max_mechanics
          ? program.max_mechanics - (activeAgreementCount || 0)
          : null

        return {
          ...program,
          active_mechanics: activeAgreementCount || 0,
          spots_available: spotsAvailable,
          has_applied: !!application,
          application_status: application?.status || null
        }
      })
    )

    return NextResponse.json({
      programs: programsWithStatus
    })

  } catch (error) {
    console.error('[BROWSE PROGRAMS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
