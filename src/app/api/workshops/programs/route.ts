import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/workshops/programs
 *
 * Create a new partnership program
 *
 * Body:
 * {
 *   program_name: string
 *   program_type: 'bay_rental' | 'revenue_share' | 'membership'
 *   description?: string
 *   daily_rate?: number (for bay_rental)
 *   hourly_rate?: number (for bay_rental)
 *   mechanic_percentage?: number (for revenue_share)
 *   workshop_percentage?: number (for revenue_share)
 *   monthly_fee?: number (for membership)
 *   included_bay_days?: number (for membership)
 *   requirements?: string[]
 *   benefits?: string[]
 *   max_mechanics?: number
 *   is_active?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('workshop_session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate workshop session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workshop_sessions')
      .select('workshop_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const {
      program_name,
      program_type,
      description,
      daily_rate,
      hourly_rate,
      mechanic_percentage,
      workshop_percentage,
      monthly_fee,
      included_bay_days,
      requirements,
      benefits,
      max_mechanics,
      is_active
    } = body

    // Validation
    if (!program_name || !program_type) {
      return NextResponse.json({
        error: 'program_name and program_type are required'
      }, { status: 400 })
    }

    if (!['bay_rental', 'revenue_share', 'membership'].includes(program_type)) {
      return NextResponse.json({
        error: 'program_type must be bay_rental, revenue_share, or membership'
      }, { status: 400 })
    }

    // Type-specific validation
    if (program_type === 'bay_rental') {
      if (!daily_rate && !hourly_rate) {
        return NextResponse.json({
          error: 'Bay rental programs require daily_rate or hourly_rate'
        }, { status: 400 })
      }
    }

    if (program_type === 'revenue_share') {
      if (!mechanic_percentage || !workshop_percentage) {
        return NextResponse.json({
          error: 'Revenue share programs require mechanic_percentage and workshop_percentage'
        }, { status: 400 })
      }
      if (mechanic_percentage + workshop_percentage !== 100) {
        return NextResponse.json({
          error: 'Mechanic and workshop percentages must add up to 100'
        }, { status: 400 })
      }
    }

    if (program_type === 'membership') {
      if (!monthly_fee) {
        return NextResponse.json({
          error: 'Membership programs require monthly_fee'
        }, { status: 400 })
      }
    }

    // Create program
    const programData = {
      workshop_id: session.workshop_id,
      program_name,
      program_type,
      description: description || null,
      daily_rate: daily_rate || null,
      hourly_rate: hourly_rate || null,
      mechanic_percentage: mechanic_percentage || null,
      workshop_percentage: workshop_percentage || null,
      monthly_fee: monthly_fee || null,
      included_bay_days: included_bay_days || null,
      requirements: requirements || [],
      benefits: benefits || [],
      max_mechanics: max_mechanics || null,
      is_active: is_active !== undefined ? is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: program, error: programError } = await supabaseAdmin
      .from('workshop_partnership_programs')
      .insert(programData)
      .select()
      .single()

    if (programError) {
      console.error('[PROGRAMS API] Create error:', programError)
      return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      program
    })

  } catch (error) {
    console.error('[PROGRAMS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/workshops/programs
 *
 * Get all partnership programs for the workshop
 * Query params:
 *   - include_inactive: boolean (default: false)
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('workshop_session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate workshop session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workshop_sessions')
      .select('workshop_id, expires_at')
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
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // Get programs
    let query = supabaseAdmin
      .from('workshop_partnership_programs')
      .select('*')
      .eq('workshop_id', session.workshop_id)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: programs, error: programsError } = await query.order('created_at', { ascending: false })

    if (programsError) {
      console.error('[PROGRAMS API] Fetch error:', programsError)
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
    }

    // Get application counts for each program
    const programsWithCounts = await Promise.all(
      (programs || []).map(async (program) => {
        const { count: applicationCount } = await supabaseAdmin
          .from('partnership_applications')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)

        const { count: activeAgreementCount } = await supabaseAdmin
          .from('partnership_agreements')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)
          .eq('status', 'active')

        return {
          ...program,
          application_count: applicationCount || 0,
          active_mechanics: activeAgreementCount || 0
        }
      })
    )

    return NextResponse.json({
      programs: programsWithCounts
    })

  } catch (error) {
    console.error('[PROGRAMS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
