import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Fetch availability blocks
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('mechanic_availability')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (availabilityError) {
      console.error('[MECHANIC AVAILABILITY API] Error:', availabilityError)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    // Map database column names to frontend-expected names
    const mappedAvailability = (availability || []).map(block => ({
      id: block.id,
      mechanic_id: block.mechanic_id,
      weekday: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      is_active: block.is_available,
    }))

    return NextResponse.json({
      availability: mappedAvailability,
    })
  } catch (error) {
    console.error('[MECHANIC AVAILABILITY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { availability } = body

    if (!Array.isArray(availability)) {
      return NextResponse.json({ error: 'Invalid availability data' }, { status: 400 })
    }

    // Delete all existing availability blocks for this mechanic
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_availability')
      .delete()
      .eq('mechanic_id', mechanic.id)

    if (deleteError) {
      console.error('[MECHANIC AVAILABILITY API] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    // Insert new availability blocks (only if there are any)
    if (availability.length > 0) {
      // Map frontend column names to database column names
      const blocksToInsert = availability.map(block => ({
        mechanic_id: mechanic.id,
        day_of_week: block.weekday,
        start_time: block.start_time,
        end_time: block.end_time,
        is_available: block.is_active ?? true,
      }))

      const { error: insertError } = await supabaseAdmin
        .from('mechanic_availability')
        .insert(blocksToInsert)

      if (insertError) {
        console.error('[MECHANIC AVAILABILITY API] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MECHANIC AVAILABILITY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
