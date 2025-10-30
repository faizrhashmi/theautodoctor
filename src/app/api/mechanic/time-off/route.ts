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
    // Fetch time off periods
    const { data: timeOff, error: timeOffError } = await supabaseAdmin
      .from('mechanic_time_off')
      .select('*')
      .eq('mechanic_id', mechanic.id)
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
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
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
        mechanic_id: mechanic.id,
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
