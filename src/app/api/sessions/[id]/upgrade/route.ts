import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/sessions/[id]/upgrade
 *
 * Upgrade session from chat to video after payment
 *
 * Body:
 * {
 *   payment_intent_id: string
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[PATCH /sessions/${sessionId}/upgrade] ${participant.role} upgrading session ${participant.sessionId}`)

  try {
    const body = await req.json()

    const {
      payment_intent_id
    } = body

    // Validate payment intent
    if (!payment_intent_id) {
      return NextResponse.json(
        { error: 'payment_intent_id is required' },
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
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Validate session can be upgraded
    if (session.session_type !== 'chat') {
      return NextResponse.json(
        { error: 'Only chat sessions can be upgraded' },
        { status: 400 }
      )
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot upgrade ${session.status} session` },
        { status: 400 }
      )
    }

    // Calculate upgrade pricing
    const basePriceChat = session.base_price // e.g., $15
    const upgradePrice = 20 // Additional $20 for video
    const totalPrice = basePriceChat + upgradePrice // e.g., $35 total

    // Update the session
    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        session_type: 'upgraded_from_chat',
        upgrade_price: upgradePrice,
        total_price: totalPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error upgrading session:', updateError)
      return NextResponse.json(
        { error: 'Failed to upgrade session' },
        { status: 500 }
      )
    }

    // TODO: Send notification to mechanic about upgrade
    // In production: Send real-time notification via WebSocket or Push
    // For now: Could send email or SMS

    // TODO: Update chat room to video room
    // This would involve:
    // - Updating the video call service (Twilio, Agora, etc.)
    // - Notifying both parties
    // - Switching UI from chat to video

    return NextResponse.json({
      success: true,
      message: 'Session upgraded to video successfully',
      session: {
        id: sessionId,
        session_type: 'upgraded_from_chat',
        base_price: basePriceChat,
        upgrade_price: upgradePrice,
        total_price: totalPrice
      }
    })

  } catch (error: any) {
    console.error('Error upgrading session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade session' },
      { status: 500 }
    )
  }
}
