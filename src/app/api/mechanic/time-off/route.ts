import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Fetch time off periods
    const { data: timeOff, error: timeOffError } = await supabaseAdmin
      .from('mechanic_time_off')
      .select('*')
      .eq('mechanic_id', session.mechanic_id)
      .order('start_date', { ascending: false })

    if (timeOffError) {
      console.error('[MECHANIC TIME OFF API] Error:', timeOffError)
      return NextResponse.json({ error: 'Failed to fetch time off' }, { status: 500 })
    }

    return NextResponse.json({
      timeOff: timeOff || [],
    })
  } catch (error) {
    console.error('[MECHANIC TIME OFF API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await req.json()
    const { start_date, end_date, reason } = body

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)

    if (startDate > endDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Insert time off
    const { error: insertError } = await supabaseAdmin
      .from('mechanic_time_off')
      .insert({
        mechanic_id: session.mechanic_id,
        start_date,
        end_date,
        reason: reason || null,
      })

    if (insertError) {
      console.error('[MECHANIC TIME OFF API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save time off' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MECHANIC TIME OFF API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
