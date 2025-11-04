import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require authentication (customer or admin)
    const authResult = await requireCustomerAPI(req)

    let userId: string | null = null
    let isAdmin = false

    // If customer auth failed, check if user is an admin
    if (authResult.error) {
      console.log('[QUOTES] Customer auth failed, checking if admin...')
      const supabaseClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return req.cookies.get(name)?.value
            },
            set() {},
            remove() {},
          },
        }
      )

      const { data: { user } } = await supabaseClient.auth.getUser()

      if (!user) {
        console.log('[QUOTES] No user found, returning 401')
        return authResult.error
      }

      console.log(`[QUOTES] User found: ${user.email}, checking role...`)

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      console.log(`[QUOTES] Profile role: ${profile?.role}`)

      if (profile?.role !== 'admin') {
        console.log('[QUOTES] User is not admin, returning 403')
        return authResult.error
      }

      isAdmin = true
      console.log(`[ADMIN] ${user.email} fetching all quotes`)
    } else {
      userId = authResult.data.id
      console.log(`[CUSTOMER] ${authResult.data.email} fetching quotes`)
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch quotes - all for admin, user-specific for customer
    let quotesQuery = supabaseAdmin
      .from('repair_quotes')
      .select(`
        id,
        diagnostic_session_id,
        mechanic_id,
        customer_id,
        status,
        customer_total,
        labor_cost,
        parts_cost,
        notes,
        created_at,
        sent_at,
        customer_responded_at
      `)

    // Filter by customer_id only if not admin
    if (!isAdmin && userId) {
      quotesQuery = quotesQuery.eq('customer_id', userId)
    }

    const { data: quotes, error: quotesError } = await quotesQuery.order('created_at', { ascending: false })

    if (quotesError) {
      console.error('Quotes fetch error:', quotesError)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    // Get mechanic/workshop names
    const mechanicIds = quotes?.map(q => q.mechanic_id).filter(Boolean) || []
    const { data: mechanics } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, account_type')
      .in('id', mechanicIds)

    const mechanicsMap = new Map(mechanics?.map(m => [m.id, { name: m.full_name, type: m.account_type }]) || [])

    // Format quotes
    const formattedQuotes = quotes?.map(quote => {
      const mechanic = quote.mechanic_id ? mechanicsMap.get(quote.mechanic_id) : null

      return {
        id: quote.id,
        diagnostic_session_id: quote.diagnostic_session_id,
        provider_name: mechanic?.name || 'Unknown Provider',
        provider_type: mechanic?.type || 'mechanic',
        status: quote.status,
        total_cost: quote.customer_total || 0,
        labor_cost: quote.labor_cost || 0,
        parts_cost: quote.parts_cost || 0,
        notes: quote.notes,
        created_at: quote.created_at,
        valid_until: quote.sent_at, // Using sent_at as valid_until fallback
        customer_response_at: quote.customer_responded_at,
      }
    }) || []

    return NextResponse.json({
      quotes: formattedQuotes,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
