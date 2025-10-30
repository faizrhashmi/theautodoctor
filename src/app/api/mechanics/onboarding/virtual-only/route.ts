import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanics/onboarding/virtual-only
 *
 * Complete onboarding for virtual-only mechanics
 *
 * Body:
 * {
 *   certifications: string[],
 *   red_seal_certified: boolean,
 *   certification_number?: string,
 *   certification_province?: string,
 *   years_experience: number,
 *   specializations?: string[],
 *   makes_serviced?: string[],
 *   bio?: string,
 *   hourly_rate?: number,
 *   phone?: string
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

    // Parse request body
    const body = await req.json()
    const {
      certifications,
      red_seal_certified,
      certification_number,
      certification_province,
      years_experience,
      specializations,
      makes_serviced,
      bio,
      hourly_rate,
      phone
    } = body

    // Validation
    if (!certifications || !Array.isArray(certifications) || certifications.length === 0) {
      return NextResponse.json({
        error: 'At least one certification is required'
      }, { status: 400 })
    }

    if (typeof years_experience !== 'number' || years_experience < 0) {
      return NextResponse.json({
        error: 'Valid years_experience is required'
      }, { status: 400 })
    }

    // Get current mechanic to verify they're virtual_only tier
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, onboarding_completed')
      .eq('id', mechanic.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Verify they selected virtual_only tier
    if (mechanic.service_tier !== 'virtual_only') {
      return NextResponse.json({
        error: 'This endpoint is only for virtual-only mechanics. Please use the appropriate onboarding flow for your service tier.'
      }, { status: 400 })
    }

    // Update mechanic profile
    const updates: Record<string, any> = {
      certifications: certifications,
      red_seal_certified: red_seal_certified || false,
      certification_number: certification_number || null,
      certification_province: certification_province || null,
      years_experience: years_experience,
      specializations: specializations || [],
      makes_serviced: makes_serviced || [],
      bio: bio || null,
      hourly_rate: hourly_rate || null,
      phone: phone || null,
      onboarding_completed: true,
      is_active: true, // Activate immediately for virtual-only
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update(updates)
      .eq('id', mechanic.id)

    if (updateError) {
      console.error('[VIRTUAL ONLY ONBOARDING API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }

    // Success! They can now start accepting virtual sessions
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed! You can now start accepting virtual consultation requests.',
      redirect_url: '/mechanics/dashboard',
      mechanic_id: mechanic.id,
      service_tier: 'virtual_only',
      can_accept_sessions: true
    })

  } catch (error) {
    console.error('[VIRTUAL ONLY ONBOARDING API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/onboarding/virtual-only
 *
 * Get current onboarding progress for virtual-only mechanics
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

    // Get mechanic profile
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        service_tier,
        certifications,
        red_seal_certified,
        certification_number,
        certification_province,
        years_experience,
        specializations,
        makes_serviced,
        bio,
        hourly_rate,
        phone,
        onboarding_completed,
        is_active
      `)
      .eq('id', mechanic.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Calculate completion percentage
    const requiredFields = ['certifications', 'years_experience']
    const optionalFields = ['red_seal_certified', 'certification_number', 'specializations', 'bio', 'phone']

    let completed = 0
    let total = requiredFields.length + optionalFields.length

    // Check required fields
    requiredFields.forEach(field => {
      if (mechanic[field as keyof typeof mechanic]) {
        if (Array.isArray(mechanic[field as keyof typeof mechanic])) {
          if ((mechanic[field as keyof typeof mechanic] as any[]).length > 0) completed++
        } else {
          completed++
        }
      }
    })

    // Check optional fields
    optionalFields.forEach(field => {
      if (mechanic[field as keyof typeof mechanic]) {
        if (Array.isArray(mechanic[field as keyof typeof mechanic])) {
          if ((mechanic[field as keyof typeof mechanic] as any[]).length > 0) completed++
        } else {
          completed++
        }
      }
    })

    const completion_percentage = Math.round((completed / total) * 100)

    return NextResponse.json({
      mechanic: mechanic,
      completion_percentage: completion_percentage,
      onboarding_completed: mechanic.onboarding_completed,
      can_accept_sessions: mechanic.onboarding_completed && mechanic.is_active
    })

  } catch (error) {
    console.error('[VIRTUAL ONLY ONBOARDING API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
