import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/mechanics/availability
 *
 * Toggle mechanic availability status
 *
 * Body:
 * {
 *   is_active: boolean
 * }
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

    // Parse request body
    const body = await req.json()
    const { is_active } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({
        error: 'is_active must be a boolean'
      }, { status: 400 })
    }

    // Update mechanic availability
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.mechanic_id)

    if (updateError) {
      console.error('[AVAILABILITY API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      is_active: is_active,
      message: is_active
        ? 'You are now available to receive session requests'
        : 'You are now unavailable. No new session requests will be shown.'
    })

  } catch (error) {
    console.error('[AVAILABILITY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/availability
 *
 * Get current availability status
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

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get mechanic availability
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('is_active')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    return NextResponse.json({
      is_active: mechanic.is_active || false
    })

  } catch (error) {
    console.error('[AVAILABILITY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
