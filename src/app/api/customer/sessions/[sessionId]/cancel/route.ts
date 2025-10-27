import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Authenticate customer
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    if (session.customer_user_id !== user.id) {
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
    const metadata = session.metadata || {}
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          cancellation_reason: reason || 'Customer cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'customer',
          refund_percentage: refundPercentage
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

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
