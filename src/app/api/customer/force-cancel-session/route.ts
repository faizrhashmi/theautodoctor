import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Force cancel a customer's stuck session
 *
 * POST /api/customer/force-cancel-session
 * Body: { sessionId: string }
 *
 * This allows customers to manually cancel sessions that are blocking them
 * from starting new ones.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Verify this session belongs to the customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, customer_user_id')
      .eq('id', sessionId)
      .eq('customer_user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    // Don't allow canceling completed sessions
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed sessions' },
        { status: 400 }
      )
    }

    // Mark as cancelled/expired
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: session.status === 'live' ? 'cancelled' : 'expired',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[force-cancel] Error updating session:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully'
    })

  } catch (error) {
    console.error('[force-cancel] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
