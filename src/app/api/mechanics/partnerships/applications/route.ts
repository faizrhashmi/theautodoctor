import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanics/partnerships/applications
 *
 * Submit a partnership application
 *
 * Body:
 * {
 *   program_id: string
 *   cover_letter?: string
 *   availability_notes?: string
 *   references?: Array<{ name: string, phone: string, relationship: string }>
 * }
 */
export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Get mechanic profile
    const { data: mechanicProfile, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('*')
      .eq('id', mechanic.id)
      .single()

    if (mechanicError || !mechanicProfile) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Check if mechanic has completed onboarding
    if (!mechanicProfile.onboarding_completed) {
      return NextResponse.json({
        error: 'Please complete your profile before applying to partnership programs'
      }, { status: 400 })
    }

    // Parse request body
    const body = await req.json()
    const { program_id, cover_letter, availability_notes, references } = body

    if (!program_id) {
      return NextResponse.json({
        error: 'program_id is required'
      }, { status: 400 })
    }

    // Get program details
    const { data: program, error: programError } = await supabaseAdmin
      .from('workshop_partnership_programs')
      .select('*, organizations!workshop_partnership_programs_workshop_id_fkey (id, name)')
      .eq('id', program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (!program.is_active) {
      return NextResponse.json({
        error: 'This program is no longer accepting applications'
      }, { status: 400 })
    }

    // Check if mechanic has already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('partnership_applications')
      .select('id, status')
      .eq('program_id', program_id)
      .eq('mechanic_id', mechanic.id)
      .single()

    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        return NextResponse.json({
          error: 'You already have a pending application for this program'
        }, { status: 400 })
      } else if (existingApplication.status === 'approved') {
        return NextResponse.json({
          error: 'You have already been approved for this program'
        }, { status: 400 })
      }
    }

    // Check if program has reached max mechanics
    if (program.max_mechanics) {
      const { count: activeCount } = await supabaseAdmin
        .from('partnership_agreements')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', program_id)
        .eq('status', 'active')

      if (activeCount && activeCount >= program.max_mechanics) {
        return NextResponse.json({
          error: 'This program has reached its maximum number of mechanics'
        }, { status: 400 })
      }
    }

    // Create application
    const applicationData = {
      program_id,
      mechanic_id: mechanic.id,
      workshop_id: program.workshop_id,
      status: 'pending',
      cover_letter: cover_letter || null,
      availability_notes: availability_notes || null,
      references: references || [],
      mechanic_profile_snapshot: {
        full_name: mechanicProfile.full_name,
        email: mechanicProfile.email,
        phone: mechanicProfile.phone,
        certifications: mechanicProfile.certifications,
        years_experience: mechanicProfile.years_experience,
        specializations: mechanicProfile.specializations,
        red_seal_certified: mechanicProfile.red_seal_certified
      },
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: application, error: applicationError } = await supabaseAdmin
      .from('partnership_applications')
      .insert(applicationData)
      .select()
      .single()

    if (applicationError) {
      console.error('[APPLICATIONS API] Create error:', applicationError)
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      application,
      message: `Application submitted to ${(program.organizations as any)?.name || 'workshop'}`
    })

  } catch (error) {
    console.error('[APPLICATIONS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/partnerships/applications
 *
 * Get mechanic's partnership applications
 * Query params:
 *   - status: 'pending' | 'under_review' | 'approved' | 'rejected'
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
    const status = searchParams.get('status')

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
        organizations!partnership_applications_workshop_id_fkey (
          id,
          name,
          city,
          province,
          phone,
          email
        )
      `)
      .eq('mechanic_id', mechanic.id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: applications, error: applicationsError } = await query.order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('[APPLICATIONS API] Fetch error:', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({
      applications: applications || []
    })

  } catch (error) {
    console.error('[APPLICATIONS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
