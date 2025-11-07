import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ACTIVE_STATUSES = ['pending', 'waiting', 'live', 'scheduled'] as const

/**
 * GET /api/customer/sessions/active
 * Returns the customer's active session (if any)
 * Active = most recent open session (ended_at IS NULL and status in pending/waiting/live/scheduled)
 * Updated with admin client to bypass RLS
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[customer/active] === API CALLED ===')

    // Create Supabase client with auth - use req.cookies like /auth/me does
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    console.log('[customer/active] Auth result:', { user: user?.id, email: user?.email, error: uerr })

    if (uerr || !user) {
      console.log('[customer/active] No user found, returning empty')
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    console.log('[customer/active] Checking active session for user:', user.id)
    console.log('[customer/active] ACTIVE_STATUSES:', ACTIVE_STATUSES)

    // Use admin client to bypass RLS and ensure we get the session
    const { data: rows, error } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, scheduled_start, scheduled_end, mechanic_id, customer_user_id')
      .eq('customer_user_id', user.id)
      .in('status', ACTIVE_STATUSES as unknown as string[])
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[customer/active] Query error:', error)
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    console.log('[customer/active] Query result:', { rowCount: rows?.length, rows })

    const active = !!(rows?.length)

    if (!active || !rows || rows.length === 0) {
      console.log('[customer/active] No active session found')
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    const s = rows[0]

    console.log('[customer/active] Returning active session:', s.id, 'status:', s.status)

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
