import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanic/queue
 * Returns available session assignments for the mechanic
 * Shows sessions with status IN ('pending', 'waiting') and assignments IN ('queued', 'offered')
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data

    // Create supabase client from request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser();

    // resolve mechanic id (used for "mine" filters, but not needed for unassigned queue)
    const { data: mech } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user?.id ?? '')
      .single();

    const debug = request.nextUrl.searchParams.get('debug') === '1';

    // Unassigned (public queue) — use user client for assignments, admin for sessions
    // assignments visible via RLS
    const { data: unassignedA } = await supabase
      .from('session_assignments')
      .select('id, status, mechanic_id, session_id, created_at, updated_at')
      .is('mechanic_id', null)
      .eq('status', 'queued')
      .order('created_at', { ascending: false })
      .limit(50);

    // fetch sessions with admin (bypass RLS) but whitelist fields
    const unassignedSessionIds = (unassignedA ?? []).map(a => a.session_id);
    const { data: unassignedS } = unassignedSessionIds.length
      ? await supabaseAdmin
          .from('sessions')
          .select('id, status, plan, type, created_at, scheduled_start, scheduled_end, started_at, ended_at')
          .in('id', unassignedSessionIds)
          .in('status', ['pending','waiting'])
      : { data: [] as any[] };

    const unassigned = (unassignedA ?? []).map(a => ({
      ...a,
      sessions: unassignedS?.find(s => s.id === a.session_id) ?? null,
    })).filter(a => a.sessions); // drop if session not eligible

    // Mine (my active work) — same pattern
    const { data: mineA } = await supabase
      .from('session_assignments')
      .select('id, status, mechanic_id, session_id, created_at, updated_at')
      .eq('mechanic_id', mech?.id ?? '00000000-0000-0000-0000-000000000000')
      .in('status', ['accepted','joined','in_progress'])
      .order('created_at', { ascending: false })
      .limit(50);

    const mineSessionIds = (mineA ?? []).map(a => a.session_id);
    const { data: mineS } = mineSessionIds.length
      ? await supabaseAdmin
          .from('sessions')
          .select('id, status, plan, type, created_at, scheduled_start, scheduled_end, started_at, ended_at')
          .in('id', mineSessionIds)
          .in('status', ['waiting','live'])
      : { data: [] as any[] };

    const mine = (mineA ?? []).map(a => ({
      ...a,
      sessions: mineS?.find(s => s.id === a.session_id) ?? null,
    })).filter(a => a.sessions);

    // Log helpful counts
    console.log('[mechanic/queue]', {
      user: user?.id, mech: mech?.id,
      unassignedA: unassignedA?.length ?? 0,
      unassignedS: unassignedS?.length ?? 0,
      mineA: mineA?.length ?? 0,
      mineS: mineS?.length ?? 0,
    });

    // Debug mode - return internal counts and sample rows
    if (debug) {
      return NextResponse.json({
        debug: {
          userId: user?.id ?? null,
          mechId: mech?.id ?? null,
          // lengths seen by the USER client (RLS applied)
          counts_user_client: {
            unassignedA: unassignedA?.length ?? 0,
            mineA: mineA?.length ?? 0,
          },
          // lengths seen by the ADMIN hydration (no RLS)
          counts_admin_hydration: {
            unassignedS: unassignedS?.length ?? 0,
            mineS: mineS?.length ?? 0,
          },
          // final arrays that UI would receive
          final_counts: {
            unassigned: unassigned?.length ?? 0,
            mine: mine?.length ?? 0,
            total:
              (unassigned?.length ?? 0) + (mine?.length ?? 0),
          },
          // first few samples to verify shape
          samples: {
            unassignedA_first: unassignedA?.[0] ?? null,
            unassignedS_first: unassignedS?.[0] ?? null,
            mineA_first: mineA?.[0] ?? null,
            mineS_first: mineS?.[0] ?? null,
            final_unassigned_first: unassigned?.[0] ?? null,
            final_mine_first: mine?.[0] ?? null,
          },
        },
        unassigned,
        mine,
        total: (unassigned?.length ?? 0) + (mine?.length ?? 0),
      });
    }

    // return combined list (adjust shape to what the UI expects)
    return NextResponse.json({
      unassigned,
      mine,
      total: (unassigned?.length ?? 0) + (mine?.length ?? 0),
    })

  } catch (error) {
    console.error('[Mechanic Queue] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
