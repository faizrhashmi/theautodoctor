import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanic/sessions/[sessionId]
 *
 * Get diagnostic session details for a mechanic
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

    // Get diagnostic session
    const { data: diagSession, error: diagError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        customer_id,
        mechanic_id,
        session_id,
        status,
        escalated,
        escalation_status,
        diagnosis_summary,
        recommended_services,
        diagnostic_photos,
        created_at,
        completed_at,
        session:session_requests!diagnostic_sessions_session_id_fkey (
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
        ),
        customer:profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', sessionId)
      .single()

    if (diagError || !diagSession) {
      return NextResponse.json({
        error: 'Diagnostic session not found'
      }, { status: 404 })
    }

    // Verify mechanic owns this session
    if (diagSession.mechanic_id !== mechanic.id) {
      return NextResponse.json({
        error: 'Not authorized to view this session'
      }, { status: 403 })
    }

    return NextResponse.json(diagSession)

  } catch (error) {
    console.error('[MECHANIC SESSION API] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
