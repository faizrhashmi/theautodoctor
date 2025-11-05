import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkAndExpireSession } from '@/lib/sessionExpiration'

/**
 * GET /api/customer/active-session
 * Returns the customer's current active session if one exists
 * Returns 404 if no active session
 */
export async function GET(req: NextRequest) {
  try {
    // Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data

    // Query for active sessions (pending, waiting, live, scheduled)
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at')
      .eq('customer_user_id', customer.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[Customer Active Session] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active session' },
        { status: 500 }
      )
    }

    // No active session
    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { message: 'No active session' },
        { status: 404 }
      )
    }

    let session = sessions[0]

    // ⏱️ Check if session has expired and auto-expire if needed
    const { expired, session: checkedSession } = await checkAndExpireSession(session.id)
    if (expired) {
      // Session just expired, return 404
      return NextResponse.json(
        { message: 'No active session' },
        { status: 404 }
      )
    }
    if (checkedSession) {
      // Update session data with checked version
      session = { ...session, ...checkedSession }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        plan: session.plan,
        createdAt: session.created_at
      }
    })

  } catch (error) {
    console.error('[Customer Active Session] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
