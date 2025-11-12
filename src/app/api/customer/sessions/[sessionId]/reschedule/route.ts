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
    console.log(`[CUSTOMER] ${customer.email} rescheduling session ${params.sessionId}`)

    const { sessionId } = params
    const body = await request.json()
    const { new_scheduled_time, reason } = body

    // Validate new scheduled time
    if (!new_scheduled_time) {
      return NextResponse.json({
        error: 'New scheduled time is required'
      }, { status: 400 })
    }

    const newTime = new Date(new_scheduled_time)
    const now = new Date()

    if (newTime <= now) {
      return NextResponse.json({
        error: 'New scheduled time must be in the future'
      }, { status: 400 })
    }

    // First verify this session belongs to the customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status, mechanic_id, metadata, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.customer_user_id !== customer.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Only allow rescheduling scheduled or pending sessions
    if (!['scheduled', 'pending'].includes(session.status)) {
      return NextResponse.json({
        error: 'Can only reschedule scheduled or pending sessions'
      }, { status: 400 })
    }

    // Check rescheduling policy (e.g., must reschedule at least 2 hours before)
    const originalTime = new Date(session.created_at)
    const hoursDifference = (originalTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursDifference < 2) {
      return NextResponse.json({
        error: 'Cannot reschedule within 2 hours of the scheduled time. Please cancel instead.'
      }, { status: 400 })
    }

    // Update session with new scheduled time
    const metadata = session.metadata || {}
    const rescheduleHistory = metadata.reschedule_history || []

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'scheduled',
        scheduled_for: newTime.toISOString(), // ⭐ FIXED: Use the actual scheduled_for column
        metadata: {
          ...metadata,
          reschedule_history: [
            ...rescheduleHistory,
            {
              old_time: session.created_at,
              new_time: new_scheduled_time,
              reason: reason || 'Customer requested',
              rescheduled_at: new Date().toISOString()
            }
          ]
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Reschedule session error:', updateError)
      return NextResponse.json({ error: 'Failed to reschedule session' }, { status: 500 })
    }

    // TODO: Notify mechanic if assigned
    // TODO: Update mechanic's calendar
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      message: 'Session rescheduled successfully',
      new_scheduled_time,
      note: 'A confirmation has been sent to your email. The mechanic will be notified of the change.'
    })

  } catch (error) {
    console.error('Reschedule session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
