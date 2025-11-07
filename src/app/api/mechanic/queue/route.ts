import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    if (!user) {
      console.log('[mechanic/queue] no user in API route');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // resolve mechanic id (used for "mine" filters, but not needed for unassigned queue)
    const { data: mech } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single();

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
      session: unassignedS?.find(s => s.id === a.session_id) ?? null,
    })).filter(a => a.session); // drop if session not eligible

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
      session: mineS?.find(s => s.id === a.session_id) ?? null,
    })).filter(a => a.session);

    // Log helpful counts
    console.log('[mechanic/queue]', {
      user: user.id, mech: mech?.id,
      unassignedA: unassignedA?.length ?? 0,
      unassignedS: unassignedS?.length ?? 0,
      mineA: mineA?.length ?? 0,
      mineS: mineS?.length ?? 0,
    });

    // Debug payload
    const debugPayload = {
      user: user.id,
      mech: mech?.id ?? null,
      counts: {
        unassignedA: unassignedA?.length ?? 0,
        unassignedS: unassignedS?.length ?? 0,
        mineA: mineA?.length ?? 0,
        mineS: mineS?.length ?? 0,
      },
      samples: {
        unassignedA: unassignedA?.[0] ?? null,
        unassignedS: unassignedS?.[0] ?? null,
        mineA: mineA?.[0] ?? null,
        mineS: mineS?.[0] ?? null,
      },
      final: {
        unassignedCount: unassigned.length,
        mineCount: mine.length,
        unassignedSample: unassigned[0] ?? null,
        mineSample: mine[0] ?? null,
      }
    };

    const { searchParams } = new URL(request.url);
    if (searchParams.get('debug') === '1') {
      return NextResponse.json(debugPayload, { status: 200 });
    }

    // return combined list (adjust shape to what the UI expects)
    return NextResponse.json({
      total: unassigned.length + mine.length,
      unassigned,
      mine,
    })

  } catch (error) {
    console.error('[Mechanic Queue] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
