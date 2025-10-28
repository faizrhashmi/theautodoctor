import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/mechanic/clock
 *
 * Clock in or clock out mechanic
 *
 * Body:
 * - action: 'clock_in' | 'clock_out'
 * - location: string (optional - where mechanic is clocking in from)
 * - notes: string (optional)
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const mechanicId = session.mechanic_id

    // Get mechanic details
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, currently_on_shift, workshop_id, last_clock_in, last_clock_out')
      .eq('id', mechanicId)
      .single()

    if (mechanicError || !mechanic) {
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
      if (mechanic.currently_on_shift) {
        return NextResponse.json({
          error: 'Already clocked in',
          clocked_in_at: mechanic.last_clock_in
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
          workshop_id: mechanic.workshop_id,
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
      if (!mechanic.currently_on_shift) {
        return NextResponse.json({
          error: 'Not currently clocked in',
          last_clock_out: mechanic.last_clock_out
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
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const mechanicId = session.mechanic_id

    // Get mechanic status from view
    const { data: status, error: statusError } = await supabaseAdmin
      .from('mechanic_availability_status')
      .select('*')
      .eq('id', mechanicId)
      .single()

    if (statusError || !status) {
      return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }

    // Get current shift info if clocked in
    let currentShift = null
    if (status.currently_on_shift) {
      const { data: shift } = await supabaseAdmin
        .from('mechanic_shift_logs')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .single()

      if (shift) {
        const shiftDuration = Math.round((new Date().getTime() - new Date(shift.clock_in_at).getTime()) / (1000 * 60))
        currentShift = {
          id: shift.id,
          clocked_in_at: shift.clock_in_at,
          duration_minutes: shiftDuration,
          location: shift.location,
          micro_sessions_taken: shift.micro_sessions_taken,
          micro_minutes_used: shift.micro_minutes_used,
          full_sessions_taken: shift.full_sessions_taken
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: {
        currently_on_shift: status.currently_on_shift,
        availability_status: status.availability_status,
        participation_mode: status.participation_mode,
        daily_micro_minutes_cap: status.daily_micro_minutes_cap,
        daily_micro_minutes_used: status.daily_micro_minutes_used,
        micro_minutes_remaining: status.micro_minutes_remaining,
        last_clock_in: status.last_clock_in,
        last_clock_out: status.last_clock_out,
        workshop_name: status.workshop_name
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
