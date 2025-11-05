import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

/**
 * GET /api/sessions/:id/state
 * Returns minimal session state for real-time polling/subscriptions
 * Ultra-lightweight endpoint optimized for frequent calls
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id

    // Create Supabase client with cookies for auth
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {}
        }
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Minimal query - just status and participants
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        status,
        customer_user_id,
        session_participants!inner (
          user_id,
          role,
          joined_at,
          left_at
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Quick access check
    const hasAccess = session.customer_user_id === user.id ||
      session.session_participants?.some((p: any) => p.user_id === user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Count active participants
    const activeParticipants = (session.session_participants || [])
      .filter((p: any) => !p.left_at)
      .map((p: any) => ({
        role: p.role,
        joinedAt: p.joined_at
      }))

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      participantCount: activeParticipants.length,
      participants: activeParticipants,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Session State] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
