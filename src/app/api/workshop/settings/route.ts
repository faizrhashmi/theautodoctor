import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * PUT /api/workshop/settings
 * Update workshop settings
 */
export async function PUT(req: NextRequest) {
  // Require workshop authentication
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data

  // Only owners can update workshop settings
  if (workshop.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only workshop owners can update settings' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()

    const {
      name,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      website,
      service_radius_km,
      mechanic_capacity,
      commission_rate,
      coverage_postal_codes,
    } = body

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    if (commission_rate < 0 || commission_rate > 100) {
      return NextResponse.json(
        { error: 'Commission rate must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (mechanic_capacity < 1 || mechanic_capacity > 100) {
      return NextResponse.json(
        { error: 'Mechanic capacity must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Update organization
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        name,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        website: website || null,
        service_radius_km,
        mechanic_capacity,
        commission_rate,
        coverage_postal_codes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workshop.organizationId)

    if (updateError) {
      console.error('[WORKSHOP SETTINGS] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    console.error('[WORKSHOP SETTINGS] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
