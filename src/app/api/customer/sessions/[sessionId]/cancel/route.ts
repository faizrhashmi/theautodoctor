import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} cancelling session ${params.sessionId}`)

    const { sessionId } = params
    const body = await request.json()
    const { reason } = body // Optional cancellation reason

    // First verify this session belongs to the customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status, plan, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.customer_user_id !== customer.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Only allow cancelling pending, waiting, or scheduled sessions
    if (!['pending', 'waiting', 'scheduled'].includes(session.status)) {
      return NextResponse.json({
        error: 'Cannot cancel completed or already cancelled sessions'
      }, { status: 400 })
    }

    // Check cancellation policy (e.g., can't cancel within 1 hour of scheduled time)
    // This is a basic example - adjust based on your business rules
    const sessionTime = new Date(session.created_at)
    const now = new Date()
    const hoursDifference = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refundAmount = 0
    let refundPercentage = 0

    // Cancellation policy:
    // - More than 24 hours before: 100% refund
    // - 2-24 hours before: 50% refund
    // - Less than 2 hours before: No refund
    if (hoursDifference > 24) {
      refundPercentage = 100
    } else if (hoursDifference > 2) {
      refundPercentage = 50
    } else {
      refundPercentage = 0
    }

    // Update session status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'cancelled',
        cancelled_by: 'customer',
        cancelled_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .in('status', ['pending', 'waiting', 'live'])

    if (updateError) {
      console.error('Cancel session error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 })
    }

    // TODO: Process refund if applicable (integrate with Stripe)
    // TODO: Notify mechanic if assigned
    // TODO: Release mechanic's slot in their calendar

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully',
      refund_percentage: refundPercentage,
      refund_note: refundPercentage > 0
        ? `You are eligible for a ${refundPercentage}% refund. It will be processed within 5-7 business days.`
        : 'No refund available for late cancellations.'
    })

  } catch (error) {
    console.error('Cancel session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
