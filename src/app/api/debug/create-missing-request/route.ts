import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Manually create missing session_request for existing session
 * POST /api/debug/create-missing-request
 * Body: { sessionId: "xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Get the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    // Check if request already exists
    const { data: existingRequest } = await supabaseAdmin
      .from('session_requests')
      .select('id')
      .eq('customer_id', session.customer_user_id)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json({
        message: 'Request already exists',
        requestId: existingRequest.id
      })
    }

    // Get customer info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', session.customer_user_id)
      .maybeSingle()

    const { data: intake } = await supabaseAdmin
      .from('intakes')
      .select('email, name')
      .eq('id', session.intake_id)
      .maybeSingle()

    const customerName = profile?.full_name || intake?.name || 'Customer'
    const customerEmail = profile?.email || intake?.email || null

    // Create the missing session_request
    const { data: newRequest, error: createError } = await supabaseAdmin
      .from('session_requests')
      .insert({
        customer_id: session.customer_user_id,
        session_type: session.type || 'chat',
        plan_code: session.plan || 'free',
        status: 'pending',
        customer_name: customerName,
        customer_email: customerEmail,
        metadata: {
          session_id: sessionId,
          intake_id: session.intake_id,
          created_manually: true,
          created_at: new Date().toISOString()
        },
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({
        error: 'Failed to create request',
        details: createError.message,
        code: createError.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session request created successfully',
      request: newRequest,
      session: {
        id: session.id,
        status: session.status,
        customer_user_id: session.customer_user_id
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
