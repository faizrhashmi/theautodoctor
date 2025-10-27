import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/sessions/upgrade/payment
 *
 * Process payment for session upgrade (chat → video)
 *
 * Body:
 * {
 *   session_id: string,
 *   upgrade_amount: number  // e.g., $20 for the upgrade
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      session_id,
      upgrade_amount
    } = body

    // Validate required fields
    if (!session_id || !upgrade_amount) {
      return NextResponse.json(
        { error: 'session_id and upgrade_amount are required' },
        { status: 400 }
      )
    }

    // Load the diagnostic session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', session_id)
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

    // TODO: Process actual payment with Stripe
    // For now, simulating payment success

    // In production, this would be:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: upgrade_amount * 100, // Convert to cents
    //   currency: 'usd',
    //   customer: stripeCustomerId,
    //   metadata: {
    //     session_id: session_id,
    //     upgrade_type: 'chat_to_video'
    //   }
    // })

    const mockPaymentIntentId = `pi_upgrade_${session_id.substring(0, 8)}`

    return NextResponse.json({
      success: true,
      payment_intent_id: mockPaymentIntentId,
      upgrade_amount: upgrade_amount,
      message: 'Payment processed successfully'
    })

  } catch (error: any) {
    console.error('Error processing upgrade payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    )
  }
}
