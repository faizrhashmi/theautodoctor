import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canDiagnose } from '@/lib/auth/permissions'

/**
 * POST /api/workshop/diagnostics/[sessionId]/complete
 *
 * Complete a diagnostic session with mechanic's findings
 *
 * Body:
 * {
 *   summary: string,
 *   findings: string[],
 *   recommended_services: string[],
 *   urgency: 'low' | 'medium' | 'high' | 'urgent',
 *   service_type: string,
 *   notes_for_service_advisor: string,
 *   photos: string[]
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const body = await req.json()

    const {
      summary,
      findings = [],
      recommended_services = [],
      urgency,
      service_type,
      notes_for_service_advisor,
      photos = []
    } = body

    // Validate required fields
    if (!summary || !summary.trim()) {
      return NextResponse.json(
        { error: 'Diagnosis summary is required' },
        { status: 400 }
      )
    }

    if (!recommended_services || recommended_services.length === 0) {
      return NextResponse.json(
        { error: 'At least one recommended service is required' },
        { status: 400 }
      )
    }

    // Load the diagnostic session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Diagnostic session not found' },
        { status: 404 }
      )
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Diagnostic session already completed' },
        { status: 400 }
      )
    }

    // TODO: Get mechanic ID from authenticated session
    // For now, using the mechanic_id from the session
    const mechanicId = session.mechanic_id

    // Check if mechanic has permission to diagnose
    if (session.workshop_id) {
      const hasPermission = await canDiagnose(session.workshop_id, mechanicId)
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to complete diagnoses' },
          { status: 403 }
        )
      }
    }

    // Update the diagnostic session with findings
    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        status: 'completed',
        diagnosis_summary: summary,
        recommended_services: recommended_services,
        urgency: urgency,
        service_type: service_type || 'general',
        photos: photos,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating diagnostic session:', updateError)
      return NextResponse.json(
        { error: 'Failed to update diagnostic session' },
        { status: 500 }
      )
    }

    // Create a notification for service advisor (optional - can be added later)
    // TODO: Send notification to service advisor that quote needs to be created

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Diagnosis submitted successfully',
      session_id: sessionId,
      next_step: 'Service advisor will create quote based on your diagnosis'
    })

  } catch (error: any) {
    console.error('Error completing diagnosis:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete diagnosis' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workshop/diagnostics/[sessionId]/complete
 *
 * Check if diagnosis can be completed (permission check)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId

    // Load the diagnostic session
    const { data: session, error } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Diagnostic session not found' },
        { status: 404 }
      )
    }

    // Return session info for pre-fill
    return NextResponse.json({
      session: {
        id: session.id,
        customer_name: 'Customer Name', // TODO: Join with customer table
        vehicle: session.vehicle_info,
        issue_description: session.issue_description,
        session_type: session.session_type,
        scheduled_at: session.scheduled_at,
        status: session.status
      },
      can_complete: session.status === 'in_progress' || session.status === 'scheduled'
    })

  } catch (error: any) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
