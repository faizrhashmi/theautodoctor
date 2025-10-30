import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Json } from '@/types/supabase'

/**
 * DEBUG ENDPOINT: Manually create a session_request for an orphaned session
 *
 * Usage: GET /api/debug/create-session-request?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({
      error: 'Missing sessionId parameter',
      usage: '/api/debug/create-session-request?sessionId=xxx'
    }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
    steps: [],
  }

  try {
    // Step 1: Fetch the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, intake_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      results.steps.push({
        step: 1,
        action: 'Fetch session',
        error: sessionError?.message || 'Session not found'
      })
      return NextResponse.json(results, { status: 404 })
    }

    results.steps.push({
      step: 1,
      action: 'Fetch session',
      success: true,
      session_type: session.type,
      customer_id: session.customer_user_id,
      intake_id: session.intake_id
    })

    // Step 2: Fetch the intake
    const { data: intake, error: intakeError } = await supabaseAdmin
      .from('intakes')
      .select('*')
      .eq('id', session.intake_id)
      .single()

    if (intakeError || !intake) {
      results.steps.push({
        step: 2,
        action: 'Fetch intake',
        error: intakeError?.message || 'Intake not found'
      })
      return NextResponse.json(results, { status: 404 })
    }

    results.steps.push({
      step: 2,
      action: 'Fetch intake',
      success: true,
      intake_data: {
        name: intake.name,
        email: intake.email,
        phone: intake.phone,
        city: intake.city,
        urgent: intake.urgent
      }
    })

    // Step 3: Get customer profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', session.customer_user_id)
      .maybeSingle()

    const customerName = profile?.full_name || intake.name || intake.email || 'Customer'

    // Step 4: Cancel any old pending requests for this customer
    const { data: cancelled, error: cancelError } = await supabaseAdmin
      .from('session_requests')
      .update({ status: 'cancelled' })
      .eq('customer_id', session.customer_user_id)
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .select()

    results.steps.push({
      step: 3,
      action: 'Cancel old pending requests',
      success: !cancelError,
      cancelled_count: cancelled?.length || 0,
      error: cancelError?.message
    })

    // Step 5: Create the session_request
    const requestPayload: any = {
      parent_session_id: sessionId,
      customer_id: session.customer_user_id,
      session_type: session.type,
      plan_code: session.plan,
      status: 'pending',
      customer_name: customerName,
      customer_email: intake.email || null,
      routing_type: 'broadcast',
      request_type: 'general',
      prefer_local_mechanic: false,
      vehicle_id: intake.vehicle_id || null,
      is_urgent: intake.urgent || false,
      metadata: {
        intake_id: session.intake_id,
        session_id: sessionId,
        concern: intake.concern || '',
        city: intake.city || '',
        phone: intake.phone || '',
        urgent: intake.urgent || false,
        make: intake.make || '',
        model: intake.model || '',
        year: intake.year || '',
        vin: intake.vin || '',
        odometer: intake.odometer || '',
        plate: intake.plate || '',
      } as Json,
    }

    const { data: newRequest, error: requestError } = await supabaseAdmin
      .from('session_requests')
      .insert(requestPayload)
      .select()
      .single()

    if (requestError) {
      results.steps.push({
        step: 4,
        action: 'Create session_request',
        error: requestError.message,
        payload: requestPayload
      })
      return NextResponse.json(results, { status: 500 })
    }

    results.steps.push({
      step: 4,
      action: 'Create session_request',
      success: true,
      request_id: newRequest.id
    })

    // Step 6: Broadcast to notify mechanics
    try {
      const { broadcastSessionRequest } = await import('@/lib/realtimeChannels')
      await broadcastSessionRequest('new_request', { request: newRequest })
      results.steps.push({
        step: 5,
        action: 'Broadcast to mechanics',
        success: true
      })
    } catch (broadcastError: any) {
      results.steps.push({
        step: 5,
        action: 'Broadcast to mechanics',
        error: broadcastError.message
      })
    }

    results.success = true
    results.request_id = newRequest.id
    results.message = '✅ Session request created successfully!'

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[create-session-request] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
