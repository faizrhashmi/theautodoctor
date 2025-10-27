import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/customer/dashboard/stats
 *
 * Get dashboard statistics for authenticated customer
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
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
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const customerId = user.id

    // Get user profile with account type
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_type, organization_id, free_session_override')
      .eq('id', customerId)
      .single()

    const accountType = profile?.account_type || 'individual'
    const isB2CCustomer = accountType === 'individual' || !profile?.account_type

    // Check if customer has used their free B2C session (only for B2C customers)
    let hasUsedFreeSession = null
    if (isB2CCustomer) {
      // Check admin override first
      if (profile?.free_session_override === true) {
        // Admin granted free session - treat as not used
        hasUsedFreeSession = false
      } else {
        const { data: freeSessionUsed } = await supabaseAdmin
          .from('sessions')
          .select('id')
          .eq('customer_user_id', customerId)
          .eq('plan', 'free')
          .limit(1)
          .maybeSingle()

        hasUsedFreeSession = !!freeSessionUsed
      }
    }

    // Get total diagnostic sessions count
    const { count: totalDiagnosticSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['completed', 'accepted', 'pending'])

    // Get total bookings count (from sessions table)
    const { count: totalBookings } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_user_id', customerId)

    // Total services is sum of both
    const totalServices = (totalDiagnosticSessions || 0) + (totalBookings || 0)

    // Calculate total spent from diagnostic sessions
    const { data: diagnosticSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price')
      .eq('customer_id', customerId)
      .eq('status', 'completed')

    const diagnosticSpent = diagnosticSessions?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0

    // Get quotes data for warranties
    const { data: quotes } = await supabaseAdmin
      .from('repair_quotes')
      .select(`
        id,
        warranty_months,
        status,
        diagnostic_sessions!inner (
          customer_id
        )
      `)
      .eq('diagnostic_sessions.customer_id', customerId)

    // Count active warranties (approved quotes with warranty months > 0)
    const activeWarranties = quotes?.filter(q =>
      q.status === 'approved' &&
      q.warranty_months &&
      q.warranty_months > 0
    ).length || 0

    // Count pending quotes
    const { count: pendingQuotes } = await supabaseAdmin
      .from('repair_quotes')
      .select(`
        id,
        diagnostic_sessions!inner (
          customer_id
        )
      `, { count: 'exact', head: true })
      .eq('diagnostic_sessions.customer_id', customerId)
      .eq('status', 'pending')

    // Get recent diagnostic sessions
    const { data: recentSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select(`
        id,
        session_type,
        status,
        total_price,
        created_at,
        mechanics (
          id,
          first_name,
          last_name
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5)

    const formattedRecentSessions = recentSessions?.map(s => ({
      id: s.id,
      mechanic_name: s.mechanics
        ? `${s.mechanics.first_name} ${s.mechanics.last_name}`
        : 'Pending Assignment',
      session_type: s.session_type,
      status: s.status,
      price: s.total_price || 0,
      created_at: s.created_at
    })) || []

    return NextResponse.json({
      stats: {
        total_services: totalServices,
        total_spent: diagnosticSpent,
        active_warranties: activeWarranties,
        pending_quotes: pendingQuotes || 0,
        has_used_free_session: hasUsedFreeSession,
        account_type: accountType,
        is_b2c_customer: isB2CCustomer
      },
      recent_sessions: formattedRecentSessions
    })

  } catch (error) {
    console.error('[CUSTOMER DASHBOARD STATS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
