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

    console.log('[mechanic/queue] user', user?.id, 'mech', mech?.id);

    // 1) Unassigned, queued requests (the public queue every mechanic can see)
    const { data: unassigned } = await supabase
      .from('session_assignments')
      .select(`
        id,
        status,
        mechanic_id,
        session_id,
        created_at,
        updated_at,
        sessions!inner(
          id,
          status,
          plan,
          type,
          created_at,
          scheduled_start,
          scheduled_end,
          customer_id
        )
      `)
      .is('mechanic_id', null)                // <<< IMPORTANT: include NULL mechanic = unassigned
      .eq('status', 'queued')                  // only queued rows
      .in('sessions.status', ['pending','waiting']) // pair with session states shown in queue
      .order('created_at', { ascending: false })
      .limit(50);

    // 2) (optional) "My" in-progress offers for this mechanic (if you show them in queue)
    const { data: mine } = await supabase
      .from('session_assignments')
      .select(`
        id,
        status,
        mechanic_id,
        session_id,
        created_at,
        updated_at,
        sessions!inner(
          id,
          status,
          plan,
          type,
          created_at,
          scheduled_start,
          scheduled_end,
          customer_id
        )
      `)
      .eq('mechanic_id', mech?.id ?? '__none__')
      .in('status', ['accepted','joined','in_progress'])
      .in('sessions.status', ['waiting','live'])
      .order('created_at', { ascending: false })
      .limit(50);

    // return combined list (adjust shape to what the UI expects)
    return NextResponse.json({
      unassigned: unassigned ?? [],
      mine: mine ?? [],
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
