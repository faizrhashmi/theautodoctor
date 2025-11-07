import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/customer/sessions/active
 * Returns the customer's active session (if any)
 * Uses three-step fetch pattern to filter out stale sessions
 */
export async function GET() {
  try {
    const supabase = createClient(cookies())

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Step 1: list this user's candidate sessions that COULD be active
    // (pending=not submitted yet, waiting=awaiting mechanic, live=started, scheduled=future booking)
    const { data: sess } = await supabase
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, mechanic_id, customer_user_id')
      .eq('customer_user_id', user.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (!sess || !sess.length) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Step 2: fetch assignments for ONLY those sessions (admin just to hydrate quickly)
    const ids = sess.map(s => s.id)
    const { data: assigns } = await supabaseAdmin
      .from('session_assignments')
      .select('id, session_id, status, mechanic_id, updated_at')
      .in('session_id', ids)

    // Step 3: define "open" assignment statuses that make a session truly active for customer
    const OPEN_ASSIGN_STATUSES = new Set(['queued', 'accepted', 'joined', 'in_progress'])

    // Step 4: pick the first session that has either:
    //  - status === 'live', OR
    //  - status === 'waiting' but ALSO has an open assignment (queued/accepted/joined/in_progress), OR
    //  - status === 'pending' ONLY if it was created in the last 10 minutes (defensive)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const isTrulyActive = (s: any) => {
      if (s.status === 'live') return true

      if (s.status === 'waiting') {
        const hasOpen = (assigns ?? []).some(a => a.session_id === s.id && OPEN_ASSIGN_STATUSES.has(a.status))
        return hasOpen
      }

      if (s.status === 'pending') {
        return s.created_at >= tenMinutesAgo // very recent pending only; older = stale
      }

      if (s.status === 'scheduled') {
        // treat *future* booking as active banner only if scheduled start is within the next 15 minutes (optional)
        // If you have scheduled_start column, uncomment this guard.
        // return s.scheduled_start && new Date(s.scheduled_start).getTime() <= Date.now() + 15*60*1000;
        return false
      }

      return false
    }

    const activeSession = sess.find(isTrulyActive) ?? null

    if (!activeSession) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Fetch mechanic name if assigned
    let mechanicName: string | null = null
    if (activeSession.mechanic_id) {
      const { data: mechanicData } = await supabaseAdmin
        .from('mechanics')
        .select('name')
        .eq('id', activeSession.mechanic_id)
        .maybeSingle()
      mechanicName = mechanicData?.name || null
    }

    // Fetch customer name
    let customerName: string | null = null
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', activeSession.customer_user_id)
      .maybeSingle()

    if (profile?.full_name) {
      customerName = profile.full_name
    } else if (user.email) {
      customerName = user.email.split('@')[0] || null
    }

    // Return active session in format expected by ActiveSessionBanner
    return NextResponse.json({
      active: true,
      session: {
        id: activeSession.id,
        type: activeSession.type,
        status: activeSession.status,
        plan: activeSession.plan,
        createdAt: activeSession.created_at,
        startedAt: activeSession.started_at,
        mechanicName,
        customerName
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
