import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/workshops/applications
 *
 * Get partnership applications for the workshop
 * Query params:
 *   - status: 'pending' | 'under_review' | 'approved' | 'rejected'
 *   - program_id: string (optional, filter by specific program)
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
    const status = searchParams.get('status')
    const programId = searchParams.get('program_id')

    // Get applications
    let query = supabaseAdmin
      .from('partnership_applications')
      .select(`
        *,
        workshop_partnership_programs!partnership_applications_program_id_fkey (
          id,
          program_name,
          program_type,
          daily_rate,
          hourly_rate,
          mechanic_percentage,
          workshop_percentage,
          monthly_fee
        ),
        mechanics!partnership_applications_mechanic_id_fkey (
          id,
          full_name,
          email,
          phone,
          certifications,
          years_experience,
          specializations,
          red_seal_certified,
          service_tier
        )
      `)
      .eq('workshop_id', session.workshop_id)

    if (status) {
      query = query.eq('status', status)
    }

    if (programId) {
      query = query.eq('program_id', programId)
    }

    const { data: applications, error: applicationsError } = await query.order('submitted_at', { ascending: false })

    if (applicationsError) {
      console.error('[WORKSHOP APPLICATIONS API] Fetch error:', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({
      applications: applications || []
    })

  } catch (error) {
    console.error('[WORKSHOP APPLICATIONS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
