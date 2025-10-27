import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/mechanic/escalate-session
 *
 * Escalate a completed diagnostic session to a workshop for repair quote creation
 *
 * Body:
 * {
 *   diagnostic_session_id: string (UUID)
 *   urgency?: 'low' | 'medium' | 'high' | 'urgent'
 *   mechanic_notes?: string
 *   workshop_id?: string (optional - if not provided, platform auto-matches)
 *   priority?: 'low' | 'normal' | 'high' | 'urgent'
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
    // Validate mechanic session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const {
      diagnostic_session_id,
      urgency = 'medium',
      mechanic_notes = '',
      workshop_id = null,
      priority = 'normal'
    } = body

    // Validate required fields
    if (!diagnostic_session_id) {
      return NextResponse.json({
        error: 'diagnostic_session_id is required'
      }, { status: 400 })
    }

    // Validate urgency
    if (!['low', 'medium', 'high', 'urgent'].includes(urgency)) {
      return NextResponse.json({
        error: 'urgency must be one of: low, medium, high, urgent'
      }, { status: 400 })
    }

    // Validate priority
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json({
        error: 'priority must be one of: low, normal, high, urgent'
      }, { status: 400 })
    }

    // Get diagnostic session details
    const { data: diagSession, error: diagError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        customer_id,
        mechanic_id,
        status,
        escalated,
        session:session_requests!diagnostic_sessions_session_id_fkey (
          id,
          vehicle_id,
          concern_summary,
          vehicles (
            year,
            make,
            model,
            color,
            license_plate
          )
        ),
        diagnosis_summary,
        recommended_services,
        diagnostic_photos,
        customer:profiles!diagnostic_sessions_customer_id_fkey (
          city
        )
      `)
      .eq('id', diagnostic_session_id)
      .single()

    if (diagError || !diagSession) {
      return NextResponse.json({
        error: 'Diagnostic session not found'
      }, { status: 404 })
    }

    // Verify mechanic owns this session
    if (diagSession.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({
        error: 'You do not have permission to escalate this session'
      }, { status: 403 })
    }

    // Verify session is completed
    if (diagSession.status !== 'completed') {
      return NextResponse.json({
        error: 'Can only escalate completed diagnostic sessions'
      }, { status: 400 })
    }

    // Verify not already escalated
    if (diagSession.escalated) {
      return NextResponse.json({
        error: 'This session has already been escalated'
      }, { status: 400 })
    }

    // Extract vehicle info
    const sessionData = diagSession.session as any
    const vehicleData = sessionData?.vehicles as any
    const customerData = diagSession.customer as any

    const vehicle_info = vehicleData ? {
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      color: vehicleData.color,
      license_plate: vehicleData.license_plate
    } : null

    const customer_city = customerData?.city || ''

    // Determine workshop assignment
    let assigned_workshop_id = workshop_id
    let assignment_method = workshop_id ? 'mechanic_choice' : 'auto_match'
    let auto_assigned = !workshop_id

    // If no workshop specified, auto-match using platform algorithm
    if (!workshop_id) {
      // Get primary service type from recommended services
      const serviceType = diagSession.recommended_services?.[0] || 'general_repair'

      // Find matching workshops
      const { data: matches, error: matchError } = await supabaseAdmin
        .rpc('find_matching_workshops', {
          p_service_type: serviceType,
          p_customer_city: customer_city,
          p_urgency: urgency
        })

      if (matchError) {
        console.error('[ESCALATE] Workshop matching error:', matchError)
      }

      // Use top match if available
      if (matches && matches.length > 0) {
        assigned_workshop_id = matches[0].workshop_id
      } else {
        // No matching workshops found - still create escalation, but unassigned
        // Workshop admins can see unassigned escalations and accept them
        assigned_workshop_id = null
      }
    }

    // Create escalation record
    const { data: escalation, error: escalationError } = await supabaseAdmin
      .from('workshop_escalation_queue')
      .insert({
        diagnostic_session_id: diagnostic_session_id,
        customer_id: diagSession.customer_id,
        escalating_mechanic_id: session.mechanic_id,
        assigned_workshop_id: assigned_workshop_id,
        status: 'pending',
        priority: priority,
        auto_assigned: auto_assigned,
        assignment_method: assignment_method,
        vehicle_info: vehicle_info,
        issue_summary: sessionData?.concern_summary || '',
        urgency: urgency,
        diagnosis_summary: diagSession.diagnosis_summary,
        recommended_services: diagSession.recommended_services || [],
        diagnostic_photos: diagSession.diagnostic_photos || [],
        mechanic_notes: mechanic_notes,
        referral_fee_percent: 5.00 // Default 5% referral fee
      })
      .select('id')
      .single()

    if (escalationError) {
      console.error('[ESCALATE] Failed to create escalation:', escalationError)
      return NextResponse.json({
        error: 'Failed to create escalation'
      }, { status: 500 })
    }

    // Initialize mechanic escalation stats if not exists
    const { error: statsError } = await supabaseAdmin
      .from('mechanic_escalation_stats')
      .upsert({
        mechanic_id: session.mechanic_id,
        total_escalations: 1,
        last_escalation_at: new Date().toISOString()
      }, {
        onConflict: 'mechanic_id',
        ignoreDuplicates: false
      })

    if (statsError) {
      console.error('[ESCALATE] Stats update error:', statsError)
      // Don't fail the request if stats update fails
    }

    // Get workshop details if assigned
    let workshop_details = null
    if (assigned_workshop_id) {
      const { data: workshop } = await supabaseAdmin
        .from('organizations')
        .select('id, name, city, rating')
        .eq('id', assigned_workshop_id)
        .single()

      workshop_details = workshop
    }

    return NextResponse.json({
      success: true,
      escalation_id: escalation.id,
      message: assigned_workshop_id
        ? 'Session escalated to workshop successfully'
        : 'Session escalated successfully. Waiting for workshop to accept.',
      assigned_workshop: workshop_details,
      auto_assigned: auto_assigned,
      referral_fee_percent: 5.00
    })

  } catch (error) {
    console.error('[ESCALATE] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * GET /api/mechanic/escalate-session?diagnostic_session_id=xxx
 *
 * Check if a session can be escalated and get escalation status
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
    // Validate mechanic session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const diagnostic_session_id = req.nextUrl.searchParams.get('diagnostic_session_id')

    if (!diagnostic_session_id) {
      return NextResponse.json({
        error: 'diagnostic_session_id is required'
      }, { status: 400 })
    }

    // Get diagnostic session
    const { data: diagSession, error: diagError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, mechanic_id, status, escalated, escalation_status, escalated_to_workshop_id')
      .eq('id', diagnostic_session_id)
      .single()

    if (diagError || !diagSession) {
      return NextResponse.json({
        error: 'Diagnostic session not found'
      }, { status: 404 })
    }

    // Verify ownership
    if (diagSession.mechanic_id !== session.mechanic_id) {
      return NextResponse.json({
        error: 'Not authorized'
      }, { status: 403 })
    }

    // Check if already escalated
    if (diagSession.escalated) {
      // Get escalation details
      const { data: escalation } = await supabaseAdmin
        .from('workshop_escalation_queue')
        .select(`
          id,
          status,
          priority,
          assigned_workshop_id,
          created_at,
          referral_fee_percent,
          organizations:assigned_workshop_id (
            id,
            name,
            city
          )
        `)
        .eq('diagnostic_session_id', diagnostic_session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return NextResponse.json({
        can_escalate: false,
        already_escalated: true,
        escalation: escalation
      })
    }

    // Check if can escalate
    const can_escalate = diagSession.status === 'completed'

    return NextResponse.json({
      can_escalate: can_escalate,
      already_escalated: false,
      session_status: diagSession.status,
      message: can_escalate
        ? 'Session can be escalated'
        : 'Session must be completed before escalation'
    })

  } catch (error) {
    console.error('[ESCALATE GET] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
