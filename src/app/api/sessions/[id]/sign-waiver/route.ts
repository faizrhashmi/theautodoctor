/**
 * POST /api/sessions/[id]/sign-waiver
 * Submit customer's waiver signature for scheduled session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface RouteContext {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabaseServer()
    const sessionId = context.params.id

    // 1. Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { signature, signedAt } = body

    if (!signature || !signature.trim()) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      )
    }

    // 3. Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_user_id, status, waiver_signed_at, scheduled_for')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 4. Verify this is the customer's session
    if (session.customer_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to sign this waiver' },
        { status: 403 }
      )
    }

    // 5. Check if already signed
    if (session.waiver_signed_at) {
      return NextResponse.json(
        { error: 'Waiver has already been signed for this session' },
        { status: 400 }
      )
    }

    // 6. Check if session is still valid
    if (session.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot sign waiver for session with status: ${session.status}` },
        { status: 400 }
      )
    }

    // 7. Update session with waiver signature
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        waiver_signed_at: signedAt || new Date().toISOString(),
        waiver_signature: signature.trim(),
        status: 'waiting' // Move to waiting status (customer ready, waiting for session time)
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[sign-waiver] Failed to update session:', updateError)
      return NextResponse.json(
        { error: 'Failed to save waiver signature' },
        { status: 500 }
      )
    }

    // 8. Create notification for mechanic (optional - could be done via webhook)
    // This lets the mechanic know the customer is ready
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: session.mechanic_user_id,
        type: 'session_waiver_signed',
        title: 'Customer Ready for Scheduled Session',
        message: 'Customer has signed the session waiver and is ready to join.',
        data: {
          sessionId: session.id,
          scheduledFor: session.scheduled_for
        },
        read: false,
        created_at: new Date().toISOString()
      })
    } catch (notifError) {
      console.error('[sign-waiver] Failed to create notification:', notifError)
      // Don't fail the request if notification fails
    }

    console.log(`[sign-waiver] ✅ Waiver signed for session ${sessionId} by user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Waiver signed successfully'
    })

  } catch (error: any) {
    console.error('[sign-waiver] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
