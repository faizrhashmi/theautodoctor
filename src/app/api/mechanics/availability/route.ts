import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

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
      .eq('id', mechanic.id)

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
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Get mechanic availability
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('is_active')
      .eq('id', mechanic.id)
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
