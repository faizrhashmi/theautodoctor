import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanics/bay-bookings
 *
 * Create a new bay booking
 *
 * Body:
 * {
 *   agreement_id: string
 *   booking_date: string (ISO date)
 *   start_time: string (HH:mm format)
 *   end_time: string (HH:mm format)
 *   bay_number?: number
 *   customer_name?: string
 *   vehicle_info?: string
 *   estimated_revenue?: number
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
      agreement_id,
      booking_date,
      start_time,
      end_time,
      bay_number,
      customer_name,
      vehicle_info,
      estimated_revenue
    } = body

    // Validation
    if (!agreement_id || !booking_date || !start_time || !end_time) {
      return NextResponse.json({
        error: 'agreement_id, booking_date, start_time, and end_time are required'
      }, { status: 400 })
    }

    // Get partnership agreement
    const { data: agreement, error: agreementError } = await supabaseAdmin
      .from('partnership_agreements')
      .select('*, workshop_partnership_programs!partnership_agreements_program_id_fkey (id, program_name, program_type)')
      .eq('id', agreement_id)
      .single()

    if (agreementError || !agreement) {
      return NextResponse.json({ error: 'Partnership agreement not found' }, { status: 404 })
    }

    // Verify mechanic owns this agreement
    if (agreement.mechanic_id !== mechanic.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify agreement is active
    if (agreement.status !== 'active') {
      return NextResponse.json({
        error: 'Partnership agreement must be active to book bays'
      }, { status: 400 })
    }

    // Check for booking conflicts
    const bookingDateTime = new Date(booking_date)
    const { data: conflictingBookings } = await supabaseAdmin
      .from('bay_bookings')
      .select('id')
      .eq('workshop_id', agreement.workshop_id)
      .eq('booking_date', booking_date)
      .eq('status', 'confirmed')
      .or(`start_time.lte.${end_time},end_time.gte.${start_time}`)

    if (bay_number && conflictingBookings && conflictingBookings.length > 0) {
      const { data: sameBayConflict } = await supabaseAdmin
        .from('bay_bookings')
        .select('id')
        .in('id', conflictingBookings.map(b => b.id))
        .eq('bay_number', bay_number)

      if (sameBayConflict && sameBayConflict.length > 0) {
        return NextResponse.json({
          error: `Bay ${bay_number} is already booked for this time slot`
        }, { status: 400 })
      }
    }

    // Calculate duration in hours
    const startParts = start_time.split(':')
    const endParts = end_time.split(':')
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
    const durationHours = (endMinutes - startMinutes) / 60

    if (durationHours <= 0) {
      return NextResponse.json({
        error: 'End time must be after start time'
      }, { status: 400 })
    }

    // Create booking
    const bookingData = {
      agreement_id,
      mechanic_id: mechanic.id,
      workshop_id: agreement.workshop_id,
      program_id: agreement.program_id,
      booking_date,
      start_time,
      end_time,
      duration_hours: durationHours,
      bay_number: bay_number || null,
      customer_name: customer_name || null,
      vehicle_info: vehicle_info || null,
      estimated_revenue: estimated_revenue || null,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bay_bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.error('[BAY BOOKINGS API] Create error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      booking,
      message: 'Bay booking created successfully'
    })

  } catch (error) {
    console.error('[BAY BOOKINGS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/bay-bookings
 *
 * Get mechanic's bay bookings
 * Query params:
 *   - status: 'confirmed' | 'completed' | 'cancelled'
 *   - from_date: ISO date (filter bookings from this date)
 *   - to_date: ISO date (filter bookings until this date)
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
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // Get bookings
    let query = supabaseAdmin
      .from('bay_bookings')
      .select(`
        *,
        organizations!bay_bookings_workshop_id_fkey (
          id,
          name,
          address,
          city,
          province
        ),
        workshop_partnership_programs!bay_bookings_program_id_fkey (
          id,
          program_name,
          program_type
        )
      `)
      .eq('mechanic_id', mechanic.id)

    if (status) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('booking_date', fromDate)
    }

    if (toDate) {
      query = query.lte('booking_date', toDate)
    }

    const { data: bookings, error: bookingsError } = await query.order('booking_date', { ascending: true })

    if (bookingsError) {
      console.error('[BAY BOOKINGS API] Fetch error:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({
      bookings: bookings || []
    })

  } catch (error) {
    console.error('[BAY BOOKINGS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
