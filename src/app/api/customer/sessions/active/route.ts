import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/customer/sessions/active
 * Returns the customer's active session (if any)
 * Active = status IN ('pending', 'waiting', 'live', 'scheduled')
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[Customer Sessions Active] Checking for ${customer.email}`)

    // Query for active session directly from sessions table
    const { data: activeSession, error: queryError } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status, plan, created_at, started_at, ended_at, mechanic_id, customer_user_id')
      .eq('customer_user_id', customer.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (queryError) {
      // 404 means no active session - this is normal
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({
          active: false,
          session: null
        })
      }

      console.error('[Customer Sessions Active] Query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to check for active sessions' },
        { status: 500 }
      )
    }

    // If no active session found
    if (!activeSession) {
      return NextResponse.json({
        active: false,
        session: null
      })
    }

    // Fetch mechanic name if assigned
    let mechanicName: string | null = null
    if (activeSession.mechanic_id) {
      const { data: mechanicData } = await supabaseAdmin
        .from('mechanics')
        .select('name')
        .eq('id', activeSession.mechanic_id)
        .maybeSingle()
      mechanicName = mechanicData?.name || null
    }

    // Fetch customer name
    let customerName: string | null = null
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', activeSession.customer_user_id)
      .maybeSingle()

    if (profile?.full_name) {
      customerName = profile.full_name
    } else if (customer.email) {
      customerName = customer.email.split('@')[0] || null
    }

    // Return active session in format expected by ActiveSessionBanner
    return NextResponse.json({
      active: true,
      session: {
        id: activeSession.id,
        type: activeSession.type,
        status: activeSession.status,
        plan: activeSession.plan,
        createdAt: activeSession.created_at,
        startedAt: activeSession.started_at,
        mechanicName,
        customerName
      }
    })

  } catch (error) {
    console.error('[Customer Sessions Active] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
