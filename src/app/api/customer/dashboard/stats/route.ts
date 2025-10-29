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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_type, organization_id, free_session_override')
      .eq('id', customerId)
      .single()

    if (profileError) {
      console.error('[CUSTOMER DASHBOARD] Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

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

    // Execute all queries in parallel for better performance
    const [
      diagnosticSessionsCount,
      sessionsCount,
      diagnosticSessionsData,
      quotesData,
      recentSessionsData
    ] = await Promise.all([
      // Count diagnostic sessions
      supabaseAdmin
        .from('diagnostic_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .in('status', ['completed', 'accepted', 'pending', 'live', 'waiting']),

      // Count regular sessions
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_user_id', customerId)
        .in('status', ['completed', 'accepted', 'pending', 'live', 'waiting']),

      // Get diagnostic sessions for pricing
      supabaseAdmin
        .from('diagnostic_sessions')
        .select('total_price, price')
        .eq('customer_id', customerId)
        .eq('status', 'completed'),

      // Get quotes data for warranties and pending counts
      supabaseAdmin
        .from('repair_quotes')
        .select(`
          id,
          warranty_months,
          status,
          diagnostic_sessions!inner (
            customer_id
          )
        `)
        .eq('diagnostic_sessions.customer_id', customerId),

      // Get recent sessions (combining both tables)
      supabaseAdmin
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
    ])

    // Calculate totals with error handling
    const totalServices = (diagnosticSessionsCount.count || 0) + (sessionsCount.count || 0)
    
    // Calculate total spent from diagnostic sessions
    const diagnosticSpent = diagnosticSessionsData.data?.reduce((sum, session) => {
      return sum + (session.total_price || session.price || 0)
    }, 0) || 0

    // Count active warranties (approved quotes with warranty months > 0)
    const activeWarranties = quotesData.data?.filter(quote =>
      quote.status === 'approved' &&
      quote.warranty_months &&
      quote.warranty_months > 0
    ).length || 0

    // Count pending quotes
    const pendingQuotes = quotesData.data?.filter(quote => quote.status === 'pending').length || 0

    // Format recent sessions for the dashboard
    const formattedRecentSessions = recentSessionsData.data?.map(session => ({
      id: session.id,
      mechanic_name: session.mechanics
        ? `${session.mechanics.first_name} ${session.mechanics.last_name}`
        : 'Pending Assignment',
      session_type: session.session_type,
      status: session.status,
      price: session.total_price || 0,
      created_at: session.created_at
    })) || []

    return NextResponse.json({
      stats: {
        total_services: totalServices,
        total_spent: diagnosticSpent,
        active_warranties: activeWarranties,
        pending_quotes: pendingQuotes,
        has_used_free_session: hasUsedFreeSession,
        account_type: accountType,
        is_b2c_customer: isB2CCustomer
      },
      recent_sessions: formattedRecentSessions
    })

  } catch (error) {
    console.error('[CUSTOMER DASHBOARD STATS API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}