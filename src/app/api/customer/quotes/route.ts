import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} fetching quotes`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch all quotes for this customer
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('repair_quotes')
      .select(`
        id,
        diagnostic_session_id,
        mechanic_id,
        status,
        total_cost,
        labor_cost,
        parts_cost,
        notes,
        created_at,
        valid_until,
        customer_response_at
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

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
        total_cost: quote.total_cost || 0,
        labor_cost: quote.labor_cost || 0,
        parts_cost: quote.parts_cost || 0,
        notes: quote.notes,
        created_at: quote.created_at,
        valid_until: quote.valid_until,
        customer_response_at: quote.customer_response_at,
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
