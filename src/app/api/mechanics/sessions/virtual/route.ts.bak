import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanics/sessions/virtual
 *
 * Get virtual session requests for the authenticated mechanic
 * Only returns sessions that the mechanic can handle (virtual-only or workshop-partner)
 *
 * Query params:
 * - status: pending | accepted | scheduled | completed (default: pending)
 * - limit: number (default: 20)
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get mechanic details to verify they can handle virtual sessions
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, onboarding_completed, is_active')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Check if mechanic is eligible to accept virtual sessions
    if (!mechanic.onboarding_completed || !mechanic.is_active) {
      return NextResponse.json({
        error: 'Please complete your onboarding first',
        redirect_url: '/mechanic/onboarding/service-tier'
      }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query for diagnostic sessions (virtual only)
    let query = supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        customer_id,
        session_type,
        status,
        base_price,
        total_price,
        vehicle_info,
        issue_description,
        created_at,
        scheduled_start,
        scheduled_end,
        profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `)
      .in('session_type', ['chat', 'video', 'upgraded_from_chat'])
      .eq('status', status)
      .is('mechanic_id', null) // Not yet assigned to a mechanic
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('[VIRTUAL SESSIONS API] Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Transform the data for easier frontend consumption
    const transformedSessions = sessions?.map(s => ({
      id: s.id,
      customer_id: s.customer_id,
      customer_name: s.profiles?.full_name || 'Unknown',
      customer_email: s.profiles?.email,
      customer_phone: s.profiles?.phone,
      session_type: s.session_type,
      status: s.status,
      base_price: s.base_price,
      total_price: s.total_price,
      vehicle_info: s.vehicle_info,
      issue_description: s.issue_description,
      created_at: s.created_at,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end
    })) || []

    return NextResponse.json({
      sessions: transformedSessions,
      total: transformedSessions.length,
      mechanic: {
        id: mechanic.id,
        service_tier: mechanic.service_tier,
        can_accept_virtual: true
      }
    })

  } catch (error) {
    console.error('[VIRTUAL SESSIONS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/mechanics/sessions/virtual/accept
 *
 * Accept a virtual session request
 *
 * Body:
 * {
 *   session_id: string
 * }
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get mechanic details
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, onboarding_completed, is_active, name, email')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Verify mechanic can accept sessions
    if (!mechanic.onboarding_completed || !mechanic.is_active) {
      return NextResponse.json({
        error: 'Please complete your onboarding first'
      }, { status: 403 })
    }

    // CRITICAL: CHECK FOR EXISTING ACTIVE SESSION
    // Prevent mechanic from accepting if they already have an active session
    // Check BOTH sessions and diagnostic_sessions tables
    const [regularSessionsCheck, diagnosticSessionsCheck] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('id, status')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['pending', 'waiting', 'live', 'scheduled'])
        .maybeSingle(),
      supabaseAdmin
        .from('diagnostic_sessions')
        .select('id, status')
        .eq('mechanic_id', mechanic.id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .maybeSingle()
    ])

    const existingActiveSession = regularSessionsCheck.data || diagnosticSessionsCheck.data

    if (existingActiveSession) {
      const tableType = regularSessionsCheck.data ? 'sessions' : 'diagnostic_sessions'
      console.warn(`[ACCEPT VIRTUAL SESSION] Mechanic ${mechanic.id} already has active session ${existingActiveSession.id} in ${tableType}`)
      return NextResponse.json(
        {
          error: 'You already have an active session. Please complete or cancel it before accepting new requests.',
          code: 'MECHANIC_HAS_ACTIVE_SESSION',
          activeSessionId: existingActiveSession.id,
        },
        { status: 409 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    // Get the diagnostic session
    const { data: diagnosticSession, error: dsError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (dsError || !diagnosticSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify it's a virtual session
    if (!['chat', 'video', 'upgraded_from_chat'].includes(diagnosticSession.session_type)) {
      return NextResponse.json({
        error: 'This is not a virtual session'
      }, { status: 400 })
    }

    // Verify session is available (not already accepted)
    if (diagnosticSession.mechanic_id) {
      return NextResponse.json({
        error: 'This session has already been accepted by another mechanic'
      }, { status: 409 })
    }

    // Update the session to assign it to this mechanic
    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        mechanic_id: mechanic.id,
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .is('mechanic_id', null) // Double-check it hasn't been claimed

    if (updateError) {
      console.error('[ACCEPT VIRTUAL SESSION] Update error:', updateError)

      // Check if it was a race condition
      const { data: checkSession } = await supabaseAdmin
        .from('diagnostic_sessions')
        .select('mechanic_id')
        .eq('id', session_id)
        .single()

      if (checkSession?.mechanic_id && checkSession.mechanic_id !== mechanic.id) {
        return NextResponse.json({
          error: 'This session was just accepted by another mechanic'
        }, { status: 409 })
      }

      return NextResponse.json({ error: 'Failed to accept session' }, { status: 500 })
    }

    // TODO: Send notification to customer
    // TODO: Create mechanic_clients record if first time with this customer

    return NextResponse.json({
      success: true,
      message: 'Session accepted successfully',
      session: {
        id: diagnosticSession.id,
        session_type: diagnosticSession.session_type,
        scheduled_start: diagnosticSession.scheduled_start,
        customer_id: diagnosticSession.customer_id
      },
      redirect_url: `/mechanic/session/${session_id}`
    })

  } catch (error) {
    console.error('[ACCEPT VIRTUAL SESSION] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
