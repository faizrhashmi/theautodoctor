import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

/**
 * GET /api/sessions/:id/events
 * Returns session events audit trail for authorized users
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

    // Fetch session to verify access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        customer_user_id,
        session_assignments (
          mechanic_id,
          mechanics (
            user_id
          )
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user has access (customer or assigned mechanic)
    const isCustomer = session.customer_user_id === user.id
    const isMechanic = session.session_assignments?.some(
      (a: any) => a.mechanics?.user_id === user.id
    )

    if (!isCustomer && !isMechanic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all session events ordered by creation time
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('session_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (eventsError) {
      console.error('[Session Events] Query error:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({
      sessionId,
      events: events || [],
      count: events?.length || 0
    })

  } catch (error) {
    console.error('[Session Events] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions/:id/events
 * Create a new session event for tracking actions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const body = await request.json()

    const { eventType, eventData, userId, userRole } = body

    if (!eventType || !userId || !userRole) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, userId, userRole' },
        { status: 400 }
      )
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Insert session event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('session_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData || {},
        user_id: userId,
        user_role: userRole,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (eventError) {
      console.error('[SESSION_EVENTS] Error creating event:', eventError)
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('[SESSION_EVENTS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
