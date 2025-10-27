import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanics/available-count
 *
 * Public endpoint to check how many mechanics are currently available
 * No authentication required - used for customer dashboard
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get all mechanics (simplified - no is_active column)
    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanics')
      .select('id')

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

    // Check which mechanics are currently in active sessions
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
    const availableNow = totalActiveMechanics - inSession
    const availabilityPercentage = Math.round((availableNow / totalActiveMechanics) * 100)

    return NextResponse.json({
      total_mechanics: totalActiveMechanics,
      available_now: availableNow,
      in_session: inSession,
      availability_percentage: availabilityPercentage,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
