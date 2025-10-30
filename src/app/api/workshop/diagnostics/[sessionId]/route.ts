import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * GET /api/workshop/diagnostics/[sessionId]
 *
 * Load diagnostic session details for the mechanic
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) viewing diagnostic session`)

    const sessionId = params.sessionId

    // Load the diagnostic session with customer info
    const { data: session, error } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        *,
        profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Diagnostic session not found' },
        { status: 404 }
      )
    }

    // Verify session belongs to this workshop
    if (session.workshop_id !== workshop.organizationId) {
      return NextResponse.json(
        { error: 'This diagnostic session does not belong to your workshop' },
        { status: 403 }
      )
    }

    // Format response
    const response = {
      id: session.id,
      customer_id: session.customer_id,
      customer_name: (session.profiles as any)?.full_name || 'Unknown Customer',
      customer_email: (session.profiles as any)?.email,
      customer_phone: (session.profiles as any)?.phone,
      vehicle: session.vehicle_info,
      issue_description: session.issue_description,
      session_type: session.session_type,
      scheduled_at: session.scheduled_at,
      status: session.status,
      diagnosis_summary: session.diagnosis_summary,
      recommended_services: session.recommended_services || [],
      urgency: session.urgency,
      service_type: session.service_type,
      photos: session.photos || []
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error fetching diagnostic session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch diagnostic session' },
      { status: 500 }
    )
  }
}
