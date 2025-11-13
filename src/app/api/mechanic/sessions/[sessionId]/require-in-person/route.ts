import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanic/sessions/[sessionId]/require-in-person
 * Mark a completed diagnostic session as requiring in-person follow-up
 *
 * This triggers the 48-hour diagnostic credit system:
 * - Sets requires_in_person_follow_up = true
 * - Auto-sets diagnostic_credit_expires_at = completed_at + 48 hours (via trigger)
 * - Customer can use credit toward in-person diagnostic within 48 hours
 */
export async function POST(
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
    // Fetch the session first to validate ownership and status
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, mechanic_id, status, completed_at, requires_in_person_follow_up, session_price, session_type')
      .eq('id', params.sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[REQUIRE IN-PERSON API] Session not found:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // ✅ VALIDATION: Mechanic must own this session
    if (session.mechanic_id !== mechanic.id) {
      return NextResponse.json({
        error: 'You can only mark your own sessions as requiring in-person follow-up',
      }, { status: 403 })
    }

    // ✅ VALIDATION: Session must be completed
    if (session.status !== 'completed') {
      return NextResponse.json({
        error: 'Session must be completed before marking as requiring in-person follow-up',
      }, { status: 400 })
    }

    // ✅ VALIDATION: Session must have completed_at timestamp
    if (!session.completed_at) {
      return NextResponse.json({
        error: 'Session must have a completion timestamp',
      }, { status: 400 })
    }

    // ✅ VALIDATION: Check if already marked
    if (session.requires_in_person_follow_up) {
      // Already marked - return current credit info
      const { data: currentSession } = await supabaseAdmin
        .from('diagnostic_sessions')
        .select('diagnostic_credit_expires_at, diagnostic_credit_used')
        .eq('id', params.sessionId)
        .single()

      return NextResponse.json({
        message: 'Session already marked as requiring in-person follow-up',
        credit_info: {
          session_id: session.id,
          credit_amount: session.session_price,
          session_type: session.session_type,
          expires_at: currentSession?.diagnostic_credit_expires_at,
          credit_used: currentSession?.diagnostic_credit_used,
        },
      })
    }

    // Update session to mark as requiring in-person follow-up
    // The database trigger will automatically set diagnostic_credit_expires_at = completed_at + 48 hours
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        requires_in_person_follow_up: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.sessionId)
      .select('id, diagnostic_credit_expires_at, session_price, session_type')
      .single()

    if (updateError) {
      console.error('[REQUIRE IN-PERSON API] Update error:', updateError)
      return NextResponse.json({
        error: 'Failed to mark session as requiring in-person follow-up',
      }, { status: 500 })
    }

    // Calculate hours until expiration for response
    const expiresAt = new Date(updatedSession.diagnostic_credit_expires_at!)
    const now = new Date()
    const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    return NextResponse.json({
      success: true,
      message: 'Session marked as requiring in-person follow-up. Customer has 48-hour credit.',
      credit_info: {
        session_id: updatedSession.id,
        credit_amount: updatedSession.session_price,
        session_type: updatedSession.session_type,
        expires_at: updatedSession.diagnostic_credit_expires_at,
        hours_remaining: Math.round(hoursRemaining * 10) / 10, // Round to 1 decimal
      },
    })
  } catch (error) {
    console.error('[REQUIRE IN-PERSON API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
