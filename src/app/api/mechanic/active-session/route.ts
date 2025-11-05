import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkAndExpireSession } from '@/lib/sessionExpiration'

/**
 * GET /api/mechanic/active-session
 * Returns the mechanic's current active session if one exists
 * Returns 404 if no active session
 */
export async function GET(req: NextRequest) {
  try {
    // Require mechanic authentication
    const authResult = await requireMechanicAPI(req)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data

    // Query for active sessions assigned to this mechanic
    // (pending, waiting, live statuses)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, customer_user_id')
      .eq('mechanic_id', mechanic.id)
      .in('status', ['pending', 'waiting', 'live'])
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('[Mechanic Active Session] Query error:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch active session' },
        { status: 500 }
      )
    }

    let activeSessions = sessions || []

    // ⏱️ Filter out expired sessions and auto-expire them
    const validSessions = []
    for (const session of activeSessions) {
      const { expired } = await checkAndExpireSession(session.id)
      if (!expired) {
        validSessions.push(session)
      }
    }

    // No active session
    if (validSessions.length === 0) {
      return NextResponse.json(
        { message: 'No active session' },
        { status: 404 }
      )
    }

    const session = validSessions[0]

    // Fetch customer name
    let customerName: string | null = null
    if (session.customer_user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', session.customer_user_id)
        .maybeSingle()

      if (profile?.full_name) {
        customerName = profile.full_name
      } else {
        // Fallback to auth user data
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(session.customer_user_id)
        if (user?.email) {
          customerName = user.email.split('@')[0] || null
        }
      }
    }

    // Mechanic name (from current mechanic)
    const mechanicName = mechanic.name

    return NextResponse.json({
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        plan: session.plan,
        createdAt: session.created_at,
        startedAt: session.started_at,
        mechanicName,
        customerName
      }
    })

  } catch (error) {
    console.error('[Mechanic Active Session] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
