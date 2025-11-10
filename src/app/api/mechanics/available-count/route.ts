import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanics/available-count
 *
 * Public endpoint to check how many mechanics are currently available
 * No authentication required - used for customer dashboard
 * Uses currently_on_shift as single source of truth for mechanic availability
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get all approved mechanics who can accept sessions
    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanics')
      .select('id, currently_on_shift')
      .eq('application_status', 'approved')
      .eq('account_status', 'active')
      .eq('can_accept_sessions', true)

    if (mechanicsError) {
      console.error('Mechanics fetch error:', mechanicsError)
      return NextResponse.json({ error: 'Failed to fetch mechanics' }, { status: 500 })
    }

    const totalActiveMechanics = mechanics?.length || 0

    if (totalActiveMechanics === 0) {
      return NextResponse.json({
        total_mechanics: 0,
        available_now: 0,
        in_session: 0,
        availability_percentage: 0,
      })
    }

    // Count mechanics who are currently on shift (single source of truth)
    const availableNow = mechanics.filter(m => m.currently_on_shift).length

    // Check which mechanics are currently in active sessions (for informational purposes)
    const mechanicIds = mechanics.map(m => m.id)

    const { data: activeSessions, error: sessionsError } = await supabaseAdmin
      .from('session_participants')
      .select(`
        user_id,
        session_id,
        sessions!inner(status)
      `)
      .in('user_id', mechanicIds)
      .eq('role', 'mechanic')
      .in('sessions.status', ['live', 'waiting'])

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
    }

    // Count unique mechanics in active sessions
    const mechanicsInSession = new Set()
    activeSessions?.forEach(participant => {
      mechanicsInSession.add(participant.user_id)
    })

    const inSession = mechanicsInSession.size
    const availabilityPercentage = totalActiveMechanics > 0
      ? Math.round((availableNow / totalActiveMechanics) * 100)
      : 0

    return NextResponse.json({
      total_mechanics: totalActiveMechanics,
      available_now: availableNow, // Based on currently_on_shift (single source of truth)
      in_session: inSession,
      availability_percentage: availabilityPercentage,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
