/**
 * PATCH /api/mechanics/[mechanicId]/profile
 * Update mechanic profile including brand specializations, keywords, location
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { calculateProfileCompletion } from '@/lib/profileCompletion'

type RouteContext = {
  params: Promise<{
    mechanicId: string
  }>
}

interface ProfileUpdateData {
  // Basic info
  name?: string
  phone?: string
  about_me?: string  // Fixed: was 'bio'

  // Brand specialization
  is_brand_specialist?: boolean
  brand_specializations?: string[]
  service_keywords?: string[]
  specialist_tier?: 'general' | 'brand' | 'master'

  // Location
  country?: string
  city?: string
  state_province?: string
  timezone?: string

  // Credentials
  certifications?: string[]
  years_of_experience?: number  // Fixed: was 'years_experience'
  red_seal_certified?: boolean  // Fixed: was 'is_red_seal'
  red_seal_number?: string
  red_seal_province?: string
  red_seal_expiry_date?: string
  shop_affiliation?: string

  // Preferences
  hourly_rate?: number
  specializations?: string[]
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { mechanicId } = await context.params
    const supabase = getSupabaseServer()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch mechanic profile
    const { data: mechanic, error } = await supabase
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        phone,
        about_me,
        is_brand_specialist,
        brand_specializations,
        service_keywords,
        specialist_tier,
        country,
        city,
        state_province,
        timezone,
        certifications,
        years_of_experience,
        red_seal_certified,
        red_seal_number,
        red_seal_province,
        red_seal_expiry_date,
        hourly_rate,
        specializations,
        shop_affiliation,
        profile_completion_score,
        can_accept_sessions,
        rating,
        completed_sessions
      `)
      .eq('id', mechanicId)
      .single()

    if (error || !mechanic) {
      return NextResponse.json(
        { error: 'Mechanic not found' },
        { status: 404 }
      )
    }

    // Verify the requesting user is the mechanic
    if (mechanic.id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - can only view your own profile' },
        { status: 403 }
      )
    }

    return NextResponse.json(mechanic)
  } catch (error: any) {
    console.error('[Mechanic Profile GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { mechanicId } = await context.params
    const supabase = getSupabaseServer()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the requesting user is the mechanic
    if (user.id !== mechanicId) {
      return NextResponse.json(
        { error: 'Forbidden - can only update your own profile' },
        { status: 403 }
      )
    }

    // Parse request body
    const updates: ProfileUpdateData = await request.json()

    // Validate brand specializations
    if (updates.brand_specializations && Array.isArray(updates.brand_specializations)) {
      // Auto-set is_brand_specialist based on whether brands are selected
      updates.is_brand_specialist = updates.brand_specializations.length > 0
    }

    // Validate specialist tier
    if (updates.specialist_tier && !['general', 'brand', 'master'].includes(updates.specialist_tier)) {
      return NextResponse.json(
        { error: 'Invalid specialist tier' },
        { status: 400 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {}
    const allowedFields = [
      'name',
      'phone',
      'about_me',  // Fixed: was 'bio'
      'is_brand_specialist',
      'brand_specializations',
      'service_keywords',
      'specialist_tier',
      'country',
      'city',
      'state_province',
      'timezone',
      'certifications',
      'years_of_experience',  // Fixed: was 'years_experience'
      'red_seal_certified',  // Fixed: was 'is_red_seal'
      'red_seal_number',
      'red_seal_province',
      'red_seal_expiry_date',
      'hourly_rate',
      'specializations',
      'shop_affiliation'
    ]

    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field as keyof ProfileUpdateData]
      }
    }

    // Update mechanic profile
    const { data: updatedMechanic, error: updateError } = await supabase
      .from('mechanics')
      .update(updateData)
      .eq('id', mechanicId)
      .select()
      .single()

    if (updateError) {
      console.error('[Mechanic Profile PATCH] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Recalculate profile completion score
    let profileCompletion = null
    try {
      profileCompletion = await calculateProfileCompletion(mechanicId)
    } catch (error) {
      console.error('[Mechanic Profile PATCH] Failed to calculate completion:', error)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      mechanic: updatedMechanic,
      profileCompletion
    })
  } catch (error: any) {
    console.error('[Mechanic Profile PATCH] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
