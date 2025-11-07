import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACTIVE_STATUSES = ['pending', 'waiting', 'live', 'scheduled'] as const

/**
 * GET /api/customer/sessions/active
 * Returns the customer's active session (if any)
 * Active = most recent open session (ended_at IS NULL and status in pending/waiting/live/scheduled)
 */
export async function GET() {
  try {
    const supabase = createClient(cookies())

    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if (uerr || !user) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Single, most-recent *open* session (customer_user_id match, active status, not ended)
    const { data: rows, error } = await supabase
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, scheduled_start, scheduled_end, mechanic_id, customer_user_id')
      .eq('customer_user_id', user.id)
      .in('status', ACTIVE_STATUSES as unknown as string[])
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('[customer/active] error:', error)
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    const active = !!(rows?.length)

    if (!active || !rows || rows.length === 0) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    const s = rows[0]

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
        scheduledStart: s.scheduled_start,
        scheduledEnd: s.scheduled_end,
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
