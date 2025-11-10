import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/mechanic/active-session
 * Returns only sessions that this mechanic has actually accepted/joined
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[mechanic/active-session] === API CALLED ===')
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
    console.log('[mechanic/active-session] Auth result:', { user: user?.id, email: user?.email, error: userErr })

    if (!user) {
      console.log('[mechanic/active-session] No user found')
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false }, { status: 200 });
    }

    // Use admin client to bypass RLS and ensure we get the mechanic
    const { data: mech, error: mechErr } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single();

    console.log('[mechanic/active-session] Mechanic lookup:', { mechId: mech?.id, error: mechErr })

    if (!mech) {
      console.log('[mechanic/active-session] No mechanic profile found')
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false }, { status: 200 });
    }

    // OPTIMIZED: Use mechanic_id directly instead of join with session_assignments
    // This reduces query time from 6-7 seconds to ~50-200ms
    const { data: rows, error: qErr } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, started_at, ended_at, created_at, customer_user_id')
      .eq('mechanic_id', mech.id)
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[mechanic/active-session] Session query:', { rowCount: rows?.length, error: qErr, rows })

    if (qErr) {
      console.error('[mechanic/active-session] Query error:', qErr)
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false }, { status: 200 });
    }

    const active = !!(rows && rows.length);
    console.log('[mechanic/active-session] Result - user:', user.id, 'mech:', mech?.id, 'active:', active, 'rows:', rows?.length ?? 0);

    if (!active || !rows || rows.length === 0) {
      console.log('[mechanic/active-session] No active session found')
      return NextResponse.json({ active: false, session: null, hasActiveSessions: false }, { status: 200 });
    }

    const s = rows[0];
    console.log('[mechanic/active-session] Returning active session:', s.id, 'status:', s.status)

    // Fetch customer name if available
    let customerName = null;
    if (s.customer_user_id) {
      const { data: customer } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', s.customer_user_id)
        .single();
      customerName = customer?.full_name || null;
    }

    return NextResponse.json({
      active: true,
      session: {
        id: s.id,
        type: s.type,
        status: s.status,
        plan: s.plan,
        createdAt: s.created_at,
        startedAt: s.started_at,
        mechanicName: null,
        customerName
      },
      hasActiveSessions: true
    }, { status: 200 });

  } catch (error) {
    console.error('[Mechanic Active Session] Unexpected error:', error)
    return NextResponse.json(
      { active: false, session: null, hasActiveSessions: false },
      { status: 200 }
    )
  }
}

export const dynamic = 'force-dynamic'
