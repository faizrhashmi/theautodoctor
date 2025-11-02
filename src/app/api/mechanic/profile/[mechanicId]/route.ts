import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(
  req: NextRequest,
  { params }: { params: { mechanicId: string } }
) {
  try {
    const mechanicId = params.mechanicId

    if (!mechanicId) {
      return NextResponse.json(
        { error: 'Mechanic ID is required' },
        { status: 400 }
      )
    }

    // Fetch mechanic profile data (excluding contact information)
    // CRITICAL FIX: Query by user_id (auth.users.id) not id (mechanics.id)
    // ChatRoom passes mechanicId as user_id from session-info API
    const { data: mechanic, error } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        about_me,
        rating,
        years_of_experience,
        specializations,
        is_brand_specialist,
        brand_specializations,
        specialist_tier,
        red_seal_certified,
        shop_affiliation,
        completed_sessions
      `)
      .eq('user_id', mechanicId)
      .maybeSingle()

    if (error) {
      console.error('[mechanic/profile] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mechanic profile' },
        { status: 500 }
      )
    }

    if (!mechanic) {
      return NextResponse.json(
        { error: 'Mechanic not found' },
        { status: 404 }
      )
    }

    // Return profile data
    return NextResponse.json({
      profile: {
        id: mechanic.id,
        name: mechanic.name || 'Mechanic',
        aboutMe: mechanic.about_me || null,
        rating: mechanic.rating || null,
        yearsOfExperience: mechanic.years_of_experience || null,
        specializations: mechanic.specializations || [],
        isBrandSpecialist: mechanic.is_brand_specialist || false,
        brandSpecializations: mechanic.brand_specializations || [],
        specialistTier: mechanic.specialist_tier || null,
        redSealCertified: mechanic.red_seal_certified || false,
        shopAffiliation: mechanic.shop_affiliation || null,
        completedSessions: mechanic.completed_sessions || 0,
      },
    })
  } catch (error) {
    console.error('[mechanic/profile] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
