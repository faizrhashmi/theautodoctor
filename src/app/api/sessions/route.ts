import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/sessions
 * Returns all sessions for the authenticated user (customer or mechanic)
 *
 * This endpoint replaces the old mock data implementation with real database queries
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a mechanic
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let sessions

    if (mechanic) {
      // Fetch sessions where user is the mechanic
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select(`
          id,
          type,
          status,
          plan,
          created_at,
          started_at,
          ended_at,
          scheduled_for,
          customer_user_id,
          profiles:customer_user_id (
            full_name
          )
        `)
        .eq('mechanic_id', mechanic.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/sessions] Error fetching mechanic sessions:', error)
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      }

      sessions = data
    } else {
      // Fetch sessions where user is the customer
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select(`
          id,
          type,
          status,
          plan,
          created_at,
          started_at,
          ended_at,
          scheduled_for,
          mechanic_id,
          mechanics:mechanic_id (
            name
          )
        `)
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/sessions] Error fetching customer sessions:', error)
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      }

      sessions = data
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('[GET /api/sessions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/sessions
 * NOTE: Session creation should go through specific flows:
 * - Free sessions: /api/intake/start
 * - Paid sessions: /api/intake/start → Stripe → /api/sessions/resolve-by-stripe
 * - Mechanic acceptance: /api/mechanic/accept
 *
 * This endpoint is deprecated and should not be used for direct session creation.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Direct session creation is not supported',
      message: 'Use /api/intake/start to create sessions through the intake flow',
    },
    { status: 400 }
  )
}
