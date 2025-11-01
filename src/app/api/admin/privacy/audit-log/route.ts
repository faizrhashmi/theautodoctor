import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get search parameters
    const searchParams = req.nextUrl.searchParams
    const email = searchParams.get('email')
    const eventType = searchParams.get('event_type')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('privacy_audit_log')
      .select(
        `
        id,
        customer_id,
        event_type,
        event_timestamp,
        user_id,
        user_role,
        ip_address,
        user_agent,
        event_details,
        legal_basis,
        data_categories_accessed,
        profiles:customer_id (email, full_name)
      `
      )
      .order('event_timestamp', { ascending: false })
      .limit(limit)

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (dateFrom) {
      query = query.gte('event_timestamp', new Date(dateFrom).toISOString())
    }

    if (dateTo) {
      // Add 1 day to include the entire end date
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('event_timestamp', endDate.toISOString())
    }

    const { data: entries, error: entriesError } = await query

    if (entriesError) {
      console.error('Error fetching audit log:', entriesError)
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      )
    }

    // Filter by email if provided (after fetch since we need to check the joined profile)
    let filteredEntries = entries || []
    if (email) {
      const emailLower = email.toLowerCase()
      filteredEntries = filteredEntries.filter((entry: any) => {
        return entry.profiles?.email?.toLowerCase().includes(emailLower)
      })
    }

    // Format entries
    const formattedEntries = filteredEntries.map((entry: any) => ({
      id: entry.id,
      customer_id: entry.customer_id,
      customer_email: entry.profiles?.email || null,
      customer_full_name: entry.profiles?.full_name || null,
      event_type: entry.event_type,
      event_timestamp: entry.event_timestamp,
      user_id: entry.user_id,
      user_role: entry.user_role,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      event_details: entry.event_details,
      legal_basis: entry.legal_basis,
      data_categories_accessed: entry.data_categories_accessed,
    }))

    return NextResponse.json({
      entries: formattedEntries,
      total: formattedEntries.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Audit log API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
