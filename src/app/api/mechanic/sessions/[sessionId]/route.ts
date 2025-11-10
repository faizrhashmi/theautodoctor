import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanic/sessions/[sessionId]
 *
 * Get session details for a mechanic (from sessions table, not diagnostic_sessions)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const { sessionId } = params

    // Get session from sessions table
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        started_at,
        ended_at,
        customer_user_id,
        mechanic_id,
        rating,
        metadata
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[MECHANIC SESSION API] Session not found:', sessionError)
      return NextResponse.json({
        error: 'Session not found'
      }, { status: 404 })
    }

    // Verify mechanic owns this session
    if (session.mechanic_id !== mechanic.id) {
      return NextResponse.json({
        error: 'Not authorized to view this session'
      }, { status: 403 })
    }

    // Get customer details
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', session.customer_user_id)
      .single()

    // Get vehicle details from session_requests (if exists)
    const { data: sessionRequest } = await supabaseAdmin
      .from('session_requests')
      .select(`
        id,
        concern_summary,
        vehicle_id,
        vehicles (
          id,
          year,
          make,
          model,
          color,
          license_plate
        )
      `)
      .eq('session_id', session.id)
      .single()

    // Calculate duration in minutes
    let durationMinutes = null
    if (session.started_at && session.ended_at) {
      const startTime = new Date(session.started_at).getTime()
      const endTime = new Date(session.ended_at).getTime()
      durationMinutes = Math.round((endTime - startTime) / 60000)
    }

    // Build response matching the expected format (compatible with frontend expectations)
    const response = {
      id: session.id,
      type: session.type,
      status: session.status,
      customer_id: session.customer_user_id,
      mechanic_id: session.mechanic_id,
      session_id: session.id,
      created_at: session.created_at,
      completed_at: session.ended_at,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_minutes: durationMinutes,
      plan: session.plan,
      rating: session.rating,
      diagnosis_summary: sessionRequest?.concern_summary || '',
      session: sessionRequest ? {
        id: sessionRequest.id,
        concern_summary: sessionRequest.concern_summary,
        vehicle_id: sessionRequest.vehicle_id,
        vehicles: sessionRequest.vehicles
      } : null,
      customer: customer ? {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email
      } : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[MECHANIC SESSION API] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
