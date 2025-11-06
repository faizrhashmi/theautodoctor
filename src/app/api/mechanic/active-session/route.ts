import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/mechanic/active-session
 * Returns only sessions that this mechanic has actually accepted/joined
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ active: false, sessions: [], hasActiveSessions: false }, { status: 200 });

    const { data: mech, error: mechErr } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mech) return NextResponse.json({ active: false, sessions: [], hasActiveSessions: false }, { status: 200 });

    // Only show sessions that this mechanic has actually accepted / joined
    const { data: rows, error: qErr } = await supabase
      .from('sessions')
      .select(`
        id, status, started_at, ended_at, created_at,
        session_assignments!inner(id, status, mechanic_id, created_at, updated_at)
      `)
      .in('status', ['waiting','live'])
      .eq('session_assignments.mechanic_id', mech.id)
      .in('session_assignments.status', ['accepted','joined','in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (qErr) {
      return NextResponse.json({ active: false, sessions: [], hasActiveSessions: false }, { status: 200 });
    }

    const active = !!(rows && rows.length);
    console.log('[mechanic/active-session] user', user.id, 'mech', mech?.id, 'rows', rows?.length ?? 0);

    return NextResponse.json({
      active,
      sessions: rows ?? [],
      hasActiveSessions: active
    }, { status: 200 });

  } catch (error) {
    console.error('[Mechanic Active Session] Unexpected error:', error)
    return NextResponse.json(
      { active: false, sessions: [], hasActiveSessions: false },
      { status: 200 }
    )
  }
}

export const dynamic = 'force-dynamic'
