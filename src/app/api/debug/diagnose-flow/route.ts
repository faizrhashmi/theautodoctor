import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT: Comprehensive flow diagnosis
 *
 * Usage: GET /api/debug/diagnose-flow?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
      usage: '/api/debug/diagnose-flow?sessionId=xxx'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    diagnosis: [],
  }

  try {
    // 1. Check if session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    results.diagnosis.push({
      step: 1,
      check: 'Session exists in sessions table',
      success: !!session,
      data: session ? {
        id: session.id,
        status: session.status,
        type: session.type,
        plan: session.plan,
        customer_user_id: session.customer_user_id,
        mechanic_id: session.mechanic_id,
        intake_id: session.intake_id,
        started_at: session.started_at,
        created_at: session.created_at
      } : null,
      error: sessionError?.message
    })

    if (!session) {
      results.problem = 'Session does not exist'
      results.fix = 'Session was likely never created or was deleted. Check intake flow.'
      return NextResponse.json(results, { status: 404 })
    }

    // 2. Check for session_request
    const { data: requests, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('customer_id', session.customer_user_id)
      .order('created_at', { ascending: false })
      .limit(5)

    results.diagnosis.push({
      step: 2,
      check: 'Session requests exist for customer',
      success: !!requests && requests.length > 0,
      count: requests?.length || 0,
      data: requests?.map(r => ({
        id: r.id,
        status: r.status,
        session_type: r.session_type,
        mechanic_id: r.mechanic_id,
        created_at: r.created_at
      })),
      error: requestError?.message
    })

    const pendingRequest = requests?.find(r => r.status === 'pending')

    if (!requests || requests.length === 0) {
      results.problem = 'No session_request created'
      results.fix = 'Waiver submit endpoint should create session_request. Check logs for errors.'
      results.flow_broken_at = 'Waiver submit - session_request creation'
    } else if (!pendingRequest) {
      results.problem = 'No pending session_request found'
      results.fix = 'Session_request may have expired or been cancelled. Check status of requests.'
    }

    // 3. Check session participants
    const { data: participants, error: participantError } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    results.diagnosis.push({
      step: 3,
      check: 'Session participants',
      success: !!participants && participants.length > 0,
      count: participants?.length || 0,
      data: participants,
      error: participantError?.message
    })

    // 4. Check customer profile
    if (session.customer_user_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', session.customer_user_id)
        .maybeSingle()

      results.diagnosis.push({
        step: 4,
        check: 'Customer profile exists',
        success: !!profile,
        data: profile,
        error: profileError?.message
      })
    }

    // 5. Check intake
    if (session.intake_id) {
      const { data: intake, error: intakeError } = await supabaseAdmin
        .from('intakes')
        .select('id, email, name, plan, urgent')
        .eq('id', session.intake_id)
        .maybeSingle()

      results.diagnosis.push({
        step: 5,
        check: 'Intake exists',
        success: !!intake,
        data: intake,
        error: intakeError?.message
      })
    }

    // 6. Check waiver signature
    if (session.intake_id) {
      const { data: waiver, error: waiverError } = await supabaseAdmin
        .from('waiver_signatures')
        .select('id, created_at, is_valid')
        .eq('intake_id', session.intake_id)
        .maybeSingle()

      results.diagnosis.push({
        step: 6,
        check: 'Waiver signed',
        success: !!waiver && waiver.is_valid,
        data: waiver,
        error: waiverError?.message
      })
    }

    results.summary = {
      session_exists: !!session,
      session_status: session?.status,
      has_mechanic: !!session?.mechanic_id,
      has_session_request: !!pendingRequest,
      flow_status: pendingRequest ? 'waiting_for_mechanic' : session?.mechanic_id ? 'mechanic_assigned' : 'broken'
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[diagnose-flow] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      diagnosis: results.diagnosis,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
