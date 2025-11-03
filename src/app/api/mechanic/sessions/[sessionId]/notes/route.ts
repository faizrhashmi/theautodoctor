import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    const { sessionId } = params
    const { notes } = await request.json()

    console.log(`[MECHANIC] ${mechanic.email} saving notes for session ${sessionId}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Verify this session belongs to the mechanic
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get mechanic profile to verify ownership
    const { data: mechanicProfile } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', mechanic.id)
      .single()

    if (!mechanicProfile || session.mechanic_id !== mechanicProfile.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Update notes
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ mechanic_notes: notes })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Update notes error:', updateError)
      return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notes saved successfully'
    })

  } catch (error) {
    console.error('Save notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    const { sessionId } = params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch notes for this session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, mechanic_notes, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get mechanic profile to verify ownership
    const { data: mechanicProfile } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', mechanic.id)
      .single()

    if (!mechanicProfile || session.mechanic_id !== mechanicProfile.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    return NextResponse.json({
      notes: session.mechanic_notes || ''
    })

  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
