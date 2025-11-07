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
 * GET /api/customer/sessions/open
 * Returns the customer's most recent open session (if any)
 * This is a robust alternative to /active with consistent response shape
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    // Fetch most recent open session using admin client to bypass RLS
    const { data: rows, error } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, scheduled_start, scheduled_end')
      .eq('customer_user_id', user.id)
      .in('status', ACTIVE_STATUSES as unknown as string[])
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('[customer/open] error:', error)
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    const active = !!(rows?.length)

    if (!active || !rows || rows.length === 0) {
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
    }

    const s = rows[0]

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
        mechanicName: null,
        customerName: null
      },
      hasActiveSessions: true
    })

  } catch (error) {
    console.error('[customer/open] Unexpected error:', error)
    return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
  }
}
