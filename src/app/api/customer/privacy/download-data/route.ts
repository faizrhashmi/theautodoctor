import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { format = 'json' } = body // json or csv

    // Log the data access request (PIPEDA compliance)
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    await supabaseAdmin.rpc('log_privacy_event', {
      p_customer_id: user.id,
      p_event_type: 'data_access_requested',
      p_performed_by: user.id,
      p_performed_by_type: 'customer',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_event_details: { format },
      p_legal_basis: 'consent',
      p_data_categories: ['all_data'],
    })

    // Fetch all customer data
    const customerData: any = {}

    // 1. Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Remove sensitive fields
      const { password, ...profileData } = profile
      customerData.profile = profileData
    }

    // 2. Vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', user.id)

    customerData.vehicles = vehicles || []

    // 3. Sessions (diagnostic sessions)
    const { data: sessions } = await supabase
      .from('diagnostic_sessions')
      .select(`
        *,
        mechanic:profiles!diagnostic_sessions_mechanic_id_fkey(id, full_name, email),
        workshop:organizations(id, organization_name)
      `)
      .eq('customer_id', user.id)

    customerData.sessions = sessions || []

    // 4. Session Requests
    const { data: sessionRequests } = await supabase
      .from('session_requests')
      .select('*')
      .eq('customer_id', user.id)

    customerData.sessionRequests = sessionRequests || []

    // 5. Quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select(`
        *,
        workshop:organizations(id, organization_name)
      `)
      .eq('customer_id', user.id)

    customerData.quotes = quotes || []

    // 6. Payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', user.id)

    if (payments) {
      // Remove sensitive payment method details
      customerData.payments = payments.map(p => ({
        ...p,
        stripe_payment_intent_id: '***REDACTED***',
        stripe_payment_method_id: '***REDACTED***',
      }))
    }

    // 7. Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('customer_id', user.id)

    customerData.reviews = reviews || []

    // 8. Consents
    const { data: consents } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('customer_id', user.id)

    customerData.consents = consents || []

    // 9. Chat Messages
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('sender_id', user.id)

    customerData.chatMessages = chatMessages || []

    // 10. Waiver Acceptances
    const { data: waivers } = await supabase
      .from('waiver_acceptances')
      .select('*')
      .eq('user_id', user.id)

    customerData.waiverAcceptances = waivers || []

    // Add metadata
    customerData.metadata = {
      exportDate: new Date().toISOString(),
      format,
      pipedaCompliance: 'This data export is provided in compliance with PIPEDA (Personal Information Protection and Electronic Documents Act)',
      retentionNotice: 'The Auto Doctor Inc. retains your data according to legal requirements (CRA: 7 years for tax records, etc.)',
    }

    // Log the data download generation
    await supabaseAdmin.rpc('log_privacy_event', {
      p_customer_id: user.id,
      p_event_type: 'data_download_generated',
      p_performed_by: user.id,
      p_performed_by_type: 'customer',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_event_details: {
        format,
        recordCounts: {
          vehicles: customerData.vehicles.length,
          sessions: customerData.sessions.length,
          quotes: customerData.quotes.length,
          payments: customerData.payments?.length || 0,
          reviews: customerData.reviews.length,
          consents: customerData.consents.length,
        },
      },
      p_legal_basis: 'consent',
      p_data_categories: ['all_data'],
    })

    if (format === 'csv') {
      // Simple CSV export (limited to profile and vehicles for simplicity)
      const csvLines = []

      // Profile CSV
      csvLines.push('=== PROFILE ===')
      csvLines.push(Object.keys(customerData.profile || {}).join(','))
      csvLines.push(Object.values(customerData.profile || {}).join(','))
      csvLines.push('')

      // Vehicles CSV
      csvLines.push('=== VEHICLES ===')
      if (customerData.vehicles.length > 0) {
        csvLines.push(Object.keys(customerData.vehicles[0]).join(','))
        customerData.vehicles.forEach((v: any) => {
          csvLines.push(Object.values(v).join(','))
        })
      }

      const csvContent = csvLines.join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="my-data-${user.id}.csv"`,
        },
      })
    }

    // JSON export (default)
    return new NextResponse(JSON.stringify(customerData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="my-data-${user.id}.json"`,
      },
    })
  } catch (error: any) {
    console.error('[download-data] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
