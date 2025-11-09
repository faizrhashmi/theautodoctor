import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * GET /api/workshop/availability
 * Get workshop availability/operating hours
 */
export async function GET(req: NextRequest) {
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data

  try {
    const { data: availability, error } = await supabaseAdmin
      .from('workshop_availability')
      .select('*')
      .eq('workshop_id', workshop.organizationId)
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error('[WORKSHOP AVAILABILITY] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      availability: availability || [],
    })
  } catch (error: any) {
    console.error('[WORKSHOP AVAILABILITY] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/workshop/availability
 * Update workshop availability/operating hours
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data

  // Only owners can update availability
  if (workshop.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only workshop owners can update availability' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { availability } = body

    if (!Array.isArray(availability) || availability.length !== 7) {
      return NextResponse.json(
        { error: 'Availability must be an array of 7 days' },
        { status: 400 }
      )
    }

    // Validate each day
    for (const day of availability) {
      if (
        typeof day.day_of_week !== 'number' ||
        day.day_of_week < 0 ||
        day.day_of_week > 6
      ) {
        return NextResponse.json(
          { error: 'Invalid day_of_week value' },
          { status: 400 }
        )
      }

      if (typeof day.is_open !== 'boolean') {
        return NextResponse.json(
          { error: 'is_open must be a boolean' },
          { status: 400 }
        )
      }

      if (day.is_open) {
        if (!day.open_time || !day.close_time) {
          return NextResponse.json(
            { error: 'open_time and close_time are required when is_open is true' },
            { status: 400 }
          )
        }
      }
    }

    // Delete existing availability for this workshop
    await supabaseAdmin
      .from('workshop_availability')
      .delete()
      .eq('workshop_id', workshop.organizationId)

    // Insert new availability
    const { error: insertError } = await supabaseAdmin
      .from('workshop_availability')
      .insert(
        availability.map((day) => ({
          workshop_id: workshop.organizationId,
          day_of_week: day.day_of_week,
          is_open: day.is_open,
          open_time: day.open_time || '09:00',
          close_time: day.close_time || '17:00',
          break_start_time: day.break_start_time || null,
          break_end_time: day.break_end_time || null,
        }))
      )

    if (insertError) {
      console.error('[WORKSHOP AVAILABILITY] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save availability' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Availability saved successfully',
    })
  } catch (error: any) {
    console.error('[WORKSHOP AVAILABILITY] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
