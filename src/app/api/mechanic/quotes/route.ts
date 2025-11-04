/**
 * Mechanic Quotes API
 * Returns all quotes created by the authenticated mechanic
 *
 * GET /api/mechanic/quotes
 *
 * Returns: { quotes: Quote[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require mechanic authentication
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.log('[MECHANIC-QUOTES] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a mechanic
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'mechanic') {
      console.log('[MECHANIC-QUOTES] User is not a mechanic')
      return NextResponse.json({ error: 'Forbidden - Mechanic access only' }, { status: 403 })
    }

    console.log(`[MECHANIC-QUOTES] Fetching quotes for mechanic: ${profile.full_name}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // Filter by status

    // Fetch mechanic's quotes
    let query = supabaseAdmin
      .from('repair_quotes')
      .select(`
        id,
        diagnostic_session_id,
        customer_id,
        status,
        customer_total,
        labor_cost,
        parts_cost,
        notes,
        created_at,
        sent_at,
        customer_responded_at,
        customer:customer_id (
          full_name,
          email
        ),
        session:diagnostic_session_id (
          customer_concern
        )
      `)
      .eq('mechanic_id', user.id)

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: quotes, error: quotesError } = await query.order('created_at', { ascending: false })

    if (quotesError) {
      console.error('[MECHANIC-QUOTES] Fetch error:', quotesError)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    // Format quotes for response
    const formattedQuotes = quotes?.map(quote => {
      const customer = quote.customer as any
      const session = quote.session as any

      return {
        id: quote.id,
        diagnostic_session_id: quote.diagnostic_session_id,
        customer_name: customer?.full_name || 'Unknown Customer',
        customer_email: customer?.email || null,
        customer_concern: session?.customer_concern || null,
        status: quote.status,
        total_cost: quote.customer_total || 0,
        labor_cost: quote.labor_cost || 0,
        parts_cost: quote.parts_cost || 0,
        notes: quote.notes,
        created_at: quote.created_at,
        sent_at: quote.sent_at,
        customer_responded_at: quote.customer_responded_at,
      }
    }) || []

    // Calculate summary stats
    const summary = {
      total: formattedQuotes.length,
      pending: formattedQuotes.filter(q => q.status === 'pending').length,
      accepted: formattedQuotes.filter(q => q.status === 'accepted').length,
      declined: formattedQuotes.filter(q => q.status === 'declined').length,
    }

    console.log(`[MECHANIC-QUOTES] Returning ${formattedQuotes.length} quotes`)

    return NextResponse.json({
      quotes: formattedQuotes,
      count: formattedQuotes.length,
      summary,
    })
  } catch (error: any) {
    console.error('[MECHANIC-QUOTES] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
