import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/customer/sessions/active
 * Returns the customer's active session (if any)
 * Active = most recent open session (ended_at IS NULL and status not in completed/cancelled)
 */
export async function GET() {
  try {
    const supabase = createClient(cookies())

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Single, most-recent *open* session (exclude completed/cancelled)
    const { data: s } = await supabase
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, scheduled_start, mechanic_id, customer_user_id')
      .eq('customer_user_id', user.id)
      .is('ended_at', null) // guarantees we don't show finished sessions
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Treat pending/waiting/live as ACTIVE
    const ACTIVE = new Set(['pending', 'waiting', 'live'])

    const active = !!(s && ACTIVE.has(s.status))

    if (!active || !s) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Return active session in format expected by ActiveSessionBanner
    return NextResponse.json({
      active: true,
      session: {
        id: s.id,
        type: s.type,
        status: s.status,
        plan: s.plan,
        createdAt: s.created_at,
        startedAt: s.started_at,
        mechanicName: null, // Can fetch if needed
        customerName: null
      },
      hasActiveSessions: true
    })

  } catch (error) {
    console.error('[Customer Sessions Active] Unexpected error:', error)
    return NextResponse.json(
      { active: false, session: null, hasActiveSessions: false },
      { status: 200 }
    )
  }
}
