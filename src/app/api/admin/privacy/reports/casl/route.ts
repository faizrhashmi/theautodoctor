import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { CASLComplianceReportPDF } from '@/lib/pdf/templates/CASLComplianceReport'

export async function POST(req: NextRequest) {
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

    const { date_from, date_to } = await req.json()

    // Get marketing consent statistics
    const { data: consentStats } = await supabase
      .from('consent_statistics')
      .select('*')
      .eq('consent_type', 'marketing_emails')
      .single()

    // Get all consents for detailed breakdown
    const { data: allConsents } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('consent_type', 'marketing_emails')

    // Calculate consent methods
    const consentMethods = {
      signup: allConsents?.filter((c) => c.consent_method === 'signup').length || 0,
      settings_page: allConsents?.filter((c) => c.consent_method === 'settings_page').length || 0,
      quote_acceptance: allConsents?.filter((c) => c.consent_method === 'quote_acceptance').length || 0,
    }

    // Get marketing email activity from audit log
    const { data: emailActivity } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('event_type', 'marketing_email_sent')
      .gte('event_timestamp', date_from || '2024-01-01')
      .lte('event_timestamp', date_to || new Date().toISOString())

    // Get unsubscribe requests
    const { data: unsubscribes } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('event_type', 'marketing_unsubscribed')
      .gte('event_timestamp', date_from || '2024-01-01')
      .lte('event_timestamp', date_to || new Date().toISOString())

    // Get recent activity
    const { data: recentOptIns } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('consent_type', 'marketing_emails')
      .eq('consent_granted', true)
      .gte('granted_at', date_from || '2024-01-01')
      .lte('granted_at', date_to || new Date().toISOString())

    const { data: recentOptOuts } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('consent_type', 'marketing_emails')
      .not('withdrawn_at', 'is', null)
      .gte('withdrawn_at', date_from || '2024-01-01')
      .lte('withdrawn_at', date_to || new Date().toISOString())

    // Get base URL for logo
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Prepare report data
    const reportData = {
      report_title: 'CASL Compliance Report',
      logo_url: `${baseUrl}/logo.png`,
      report_period: {
        start_date: date_from || '2024-01-01',
        end_date: date_to || new Date().toISOString(),
      },
      generated_at: new Date().toISOString(),
      marketing_consent: {
        total_customers: consentStats?.total_consent_records || 0,
        opted_in: consentStats?.active_consents || 0,
        opted_out: consentStats?.withdrawn_consents || 0,
        opt_in_rate: consentStats?.opt_in_percentage || 0,
        withdrawal_rate: consentStats?.withdrawal_percentage || 0,
      },
      consent_methods: consentMethods,
      email_compliance: {
        emails_sent: emailActivity?.length || 0,
        unsubscribe_requests: unsubscribes?.length || 0,
        bounces: 0, // TODO: Track email bounces
        spam_complaints: 0, // TODO: Track spam complaints
      },
      recent_activity: {
        new_opt_ins: recentOptIns?.length || 0,
        new_opt_outs: recentOptOuts?.length || 0,
        net_change: (recentOptIns?.length || 0) - (recentOptOuts?.length || 0),
      },
    }

    // Generate PDF
    const pdfStream = await renderToStream(CASLComplianceReportPDF({ data: reportData }))

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    const reader = pdfStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }

    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CASL_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('CASL report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CASL report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
