import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { PIPEDAComplianceReportPDF } from '@/lib/pdf/templates/PIPEDAComplianceReport'

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

    // Get compliance score
    const { data: complianceScoreData } = await supabase.rpc('get_privacy_compliance_score')

    // Get consent summary
    const { data: consentStats } = await supabase
      .from('consent_statistics')
      .select('*')

    const marketingConsent = consentStats?.find((s) => s.consent_type === 'marketing_emails') || {
      total_consent_records: 0,
      active_consents: 0,
      withdrawn_consents: 0,
      opt_in_percentage: 0,
    }

    // Get data access requests
    const { data: dataAccessRequests } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('event_type', 'data_access_requested')
      .gte('event_timestamp', date_from || '2024-01-01')
      .lte('event_timestamp', date_to || new Date().toISOString())

    const { data: completedRequests } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .eq('event_type', 'data_download_generated')
      .gte('event_timestamp', date_from || '2024-01-01')
      .lte('event_timestamp', date_to || new Date().toISOString())

    // Calculate overdue requests
    const { data: overdueRequests } = await supabase
      .from('data_access_requests_pending')
      .select('*')
      .eq('status', 'overdue')

    // Get account deletions
    const { data: deletions } = await supabase
      .from('account_deletion_queue')
      .select('status')
      .gte('requested_at', date_from || '2024-01-01')
      .lte('requested_at', date_to || new Date().toISOString())

    const deletionStats = {
      pending: deletions?.filter((d) => d.status === 'pending').length || 0,
      completed: deletions?.filter((d) => d.status === 'completed').length || 0,
      rejected: deletions?.filter((d) => d.status === 'rejected').length || 0,
    }

    // Get data breaches
    const { data: breaches } = await supabase
      .from('data_breach_log')
      .select('*')
      .gte('discovered_at', date_from || '2024-01-01')
      .lte('discovered_at', date_to || new Date().toISOString())

    const breachStats = {
      total_incidents: breaches?.length || 0,
      critical_high: breaches?.filter((b) => ['critical', 'high'].includes(b.severity)).length || 0,
      commissioner_notified: breaches?.filter((b) => b.privacy_commissioner_notified).length || 0,
      customers_notified: breaches?.filter((b) => b.customers_notified).length || 0,
    }

    // Get base URL for logo
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Prepare report data
    const reportData = {
      report_title: 'PIPEDA Compliance Report',
      logo_url: `${baseUrl}/logo.png`,
      report_period: {
        start_date: date_from || '2024-01-01',
        end_date: date_to || new Date().toISOString(),
      },
      generated_at: new Date().toISOString(),
      generated_by: profile.role,
      compliance_score: complianceScoreData || {
        total_customers: 0,
        compliant_customers: 0,
        non_compliant_customers: 0,
        compliance_score: 0,
        compliance_grade: 'N/A',
      },
      consent_summary: {
        total_consents: consentStats?.reduce((sum, s) => sum + s.total_consent_records, 0) || 0,
        active_consents: consentStats?.reduce((sum, s) => sum + s.active_consents, 0) || 0,
        withdrawn_consents: consentStats?.reduce((sum, s) => sum + s.withdrawn_consents, 0) || 0,
        marketing_opt_in_rate: marketingConsent.opt_in_percentage || 0,
      },
      data_access_requests: {
        total_requests: dataAccessRequests?.length || 0,
        completed_on_time: completedRequests?.length || 0,
        overdue_requests: overdueRequests?.length || 0,
        average_response_days: 15, // TODO: Calculate actual average
      },
      account_deletions: deletionStats,
      data_breaches: breachStats,
    }

    // Generate PDF
    const pdfStream = await renderToStream(PIPEDAComplianceReportPDF({ data: reportData }))

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
        'Content-Disposition': `attachment; filename="PIPEDA_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PIPEDA report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PIPEDA report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
