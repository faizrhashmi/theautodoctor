import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const timeOffId = params.id

    // Verify time off belongs to this mechanic
    const { data: timeOff, error: fetchError } = await supabaseAdmin
      .from('mechanic_time_off')
      .select('mechanic_id')
      .eq('id', timeOffId)
      .single()

    if (fetchError || !timeOff) {
      return NextResponse.json({ error: 'Time off not found' }, { status: 404 })
    }

    if (timeOff.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the time off
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_time_off')
      .delete()
      .eq('id', timeOffId)

    if (deleteError) {
      console.error('[DELETE TIME OFF] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete time off' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE TIME OFF API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
