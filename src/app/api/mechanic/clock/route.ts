import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanic/clock
 *
 * Clock in or clock out mechanic
 * UPDATED: Uses unified Supabase Auth via requireMechanicAPI
 *
 * Body:
 * - action: 'clock_in' | 'clock_out'
 * - location: string (optional - where mechanic is clocking in from)
 * - notes: string (optional)
 */
export async function POST(req: NextRequest) {
  // ✅ Use unified auth guard
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) {
    return authResult.error
  }

  const mechanic = authResult.data
  const mechanicId = mechanic.id

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Get mechanic details
    const { data: mechanicData, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, currently_on_shift, workshop_id, last_clock_in, last_clock_out')
      .eq('id', mechanicId)
      .single()

    if (mechanicError || !mechanicData) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const { action, location, notes } = body

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be clock_in or clock_out' }, { status: 400 })
    }

    // CLOCK IN
    if (action === 'clock_in') {
      if (mechanicData.currently_on_shift) {
        return NextResponse.json({
          error: 'Already clocked in',
          clocked_in_at: mechanicData.last_clock_in
        }, { status: 400 })
      }

      const clockInTime = new Date().toISOString()

      // Update mechanic status
      const { error: updateError } = await supabaseAdmin
        .from('mechanics')
        .update({
          currently_on_shift: true,
          last_clock_in: clockInTime
        })
        .eq('id', mechanicId)

      if (updateError) {
        console.error('[CLOCK IN] Error updating mechanic:', updateError)
        return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
      }

      // Create shift log entry
      const { error: logError } = await supabaseAdmin
        .from('mechanic_shift_logs')
        .insert({
          mechanic_id: mechanicId,
          workshop_id: mechanicData.workshop_id,
          clock_in_at: clockInTime,
          location: location || null,
          notes: notes || null
        })

      if (logError) {
        console.error('[CLOCK IN] Error creating shift log:', logError)
        // Non-critical, continue
      }

      return NextResponse.json({
        ok: true,
        action: 'clock_in',
        message: 'Successfully clocked in',
        clocked_in_at: clockInTime,
        status: 'on_shift'
      })
    }

    // CLOCK OUT
    if (action === 'clock_out') {
      if (!mechanicData.currently_on_shift) {
        return NextResponse.json({
          error: 'Not currently clocked in',
          last_clock_out: mechanicData.last_clock_out
        }, { status: 400 })
      }

      const clockOutTime = new Date().toISOString()

      // Update mechanic status
      const { error: updateError } = await supabaseAdmin
        .from('mechanics')
        .update({
          currently_on_shift: false,
          last_clock_out: clockOutTime
        })
        .eq('id', mechanicId)

      if (updateError) {
        console.error('[CLOCK OUT] Error updating mechanic:', updateError)
        return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
      }

      // Find and close the open shift log
      const { data: openShift } = await supabaseAdmin
        .from('mechanic_shift_logs')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .single()

      if (openShift) {
        const clockInDate = new Date(openShift.clock_in_at)
        const clockOutDate = new Date(clockOutTime)
        const durationMinutes = Math.round((clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60))

        // Get session stats during shift
        const { data: microSessions } = await supabaseAdmin
          .from('diagnostic_sessions')
          .select('id, duration_minutes')
          .eq('mechanic_id', mechanicId)
          .eq('session_duration_type', 'micro')
          .gte('created_at', openShift.clock_in_at)
          .lte('created_at', clockOutTime)

        const { data: fullSessions } = await supabaseAdmin
          .from('diagnostic_sessions')
          .select('id')
          .eq('mechanic_id', mechanicId)
          .in('session_duration_type', ['standard', 'extended'])
          .gte('created_at', openShift.clock_in_at)
          .lte('created_at', clockOutTime)

        const microMinutes = (microSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

        // Update shift log
        await supabaseAdmin
          .from('mechanic_shift_logs')
          .update({
            clock_out_at: clockOutTime,
            shift_duration_minutes: durationMinutes,
            micro_sessions_taken: (microSessions || []).length,
            micro_minutes_used: microMinutes,
            full_sessions_taken: (fullSessions || []).length,
            notes: notes ? `${openShift.notes || ''}\nClock-out: ${notes}`.trim() : openShift.notes
          })
          .eq('id', openShift.id)
      }

      return NextResponse.json({
        ok: true,
        action: 'clock_out',
        message: 'Successfully clocked out',
        clocked_out_at: clockOutTime,
        shift_duration_minutes: openShift ? Math.round((new Date(clockOutTime).getTime() - new Date(openShift.clock_in_at).getTime()) / (1000 * 60)) : null,
        status: 'off_shift'
      })
    }

  } catch (error: any) {
    console.error('[CLOCK API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process clock action' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mechanic/clock
 *
 * Get current clock status
 * UPDATED: Uses unified Supabase Auth via requireMechanicAPI
 */
export async function GET(req: NextRequest) {
  // ✅ Use unified auth guard
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) {
    return authResult.error
  }

  const mechanic = authResult.data
  const mechanicId = mechanic.id

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Get mechanic status directly from mechanics table
    const { data: mechanicData, error: statusError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        currently_on_shift,
        participation_mode,
        daily_micro_minutes_cap,
        daily_micro_minutes_used,
        last_micro_reset_date,
        last_clock_in,
        last_clock_out,
        workshop_id,
        organizations:workshop_id (
          name
        )
      `)
      .eq('id', mechanicId)
      .single()

    if (statusError || !mechanicData) {
      console.error('[CLOCK STATUS API] Error fetching mechanic:', statusError)
      return NextResponse.json({
        error: 'Failed to get status',
        details: statusError?.message
      }, { status: 500 })
    }

    // Reset daily micro minutes if it's a new day
    const today = new Date().toISOString().split('T')[0]
    const lastReset = mechanicData.last_micro_reset_date
    let dailyMinutesUsed = mechanicData.daily_micro_minutes_used || 0

    if (lastReset !== today) {
      // Reset for new day
      await supabaseAdmin
        .from('mechanics')
        .update({
          daily_micro_minutes_used: 0,
          last_micro_reset_date: today
        })
        .eq('id', mechanicId)

      dailyMinutesUsed = 0
    }

    // Calculate availability status
    let availabilityStatus = 'offline'
    if (mechanicData.currently_on_shift) {
      availabilityStatus = 'on_shift'
    }

    // Get current shift info if clocked in
    let currentShift = null
    if (mechanicData.currently_on_shift) {
      const { data: shift } = await supabaseAdmin
        .from('mechanic_shift_logs')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (shift) {
        const shiftDuration = Math.round((new Date().getTime() - new Date(shift.clock_in_at).getTime()) / (1000 * 60))
        currentShift = {
          id: shift.id,
          clocked_in_at: shift.clock_in_at,
          duration_minutes: shiftDuration,
          location: shift.location,
          micro_sessions_taken: shift.micro_sessions_taken || 0,
          micro_minutes_used: shift.micro_minutes_used || 0,
          full_sessions_taken: shift.full_sessions_taken || 0
        }
      }
    }

    const dailyCap = mechanicData.daily_micro_minutes_cap || 30
    const microRemaining = Math.max(0, dailyCap - dailyMinutesUsed)

    return NextResponse.json({
      ok: true,
      status: {
        currently_on_shift: mechanicData.currently_on_shift || false,
        availability_status: availabilityStatus,
        participation_mode: mechanicData.participation_mode || 'both',
        daily_micro_minutes_cap: dailyCap,
        daily_micro_minutes_used: dailyMinutesUsed,
        micro_minutes_remaining: microRemaining,
        last_clock_in: mechanicData.last_clock_in,
        last_clock_out: mechanicData.last_clock_out,
        workshop_name: mechanicData.organizations?.name || null
      },
      current_shift: currentShift
    })

  } catch (error: any) {
    console.error('[CLOCK STATUS API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get clock status' },
      { status: 500 }
    )
  }
}
