import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get dashboard summary from database view
    const { data: dashboardSummary, error: summaryError } = await supabase
      .from('admin_privacy_dashboard_summary')
      .select('*')
      .single()

    if (summaryError) {
      console.error('[admin-privacy-metrics] Dashboard summary error:', summaryError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard summary' },
        { status: 500 }
      )
    }

    // Get PIPEDA compliance score
    const { data: complianceScore, error: scoreError } = await supabase
      .rpc('get_privacy_compliance_score')

    if (scoreError) {
      console.error('[admin-privacy-metrics] Compliance score error:', scoreError)
    }

    // Get consent statistics
    const { data: consentStats, error: consentError } = await supabase
      .from('consent_statistics')
      .select('*')

    if (consentError) {
      console.error('[admin-privacy-metrics] Consent stats error:', consentError)
    }

    return NextResponse.json({
      summary: {
        totalCustomersWithConsents: dashboardSummary.total_customers_with_consents || 0,
        customersFullyCompliant: dashboardSummary.customers_fully_compliant || 0,
        customersOptedInMarketing: dashboardSummary.customers_opted_in_marketing || 0,
        dataAccessRequests30Days: dashboardSummary.data_access_requests_30_days || 0,
        dataAccessRequestsOverdue: dashboardSummary.data_access_requests_overdue || 0,
        pendingDeletionRequests: dashboardSummary.pending_deletion_requests || 0,
        deletionsCompleted30Days: dashboardSummary.deletions_completed_30_days || 0,
        activeDataBreaches: dashboardSummary.active_data_breaches || 0,
        criticalHighBreaches: dashboardSummary.critical_high_breaches || 0,
        privacyEvents24Hours: dashboardSummary.privacy_events_24_hours || 0,
        optOuts7Days: dashboardSummary.opt_outs_7_days || 0,
      },
      complianceScore: complianceScore || {
        total_customers: 0,
        compliant_customers: 0,
        non_compliant_customers: 0,
        compliance_score: 0,
        compliance_grade: 'F',
      },
      consentStats: (consentStats || []).map(stat => ({
        consentType: stat.consent_type,
        totalRecords: stat.total_consent_records,
        activeConsents: stat.active_consents,
        withdrawnConsents: stat.withdrawn_consents,
        grantedAtSignup: stat.granted_at_signup,
        grantedInSettings: stat.granted_in_settings,
        grantedAtQuote: stat.granted_at_quote,
        optInPercentage: stat.opt_in_percentage,
        withdrawalPercentage: stat.withdrawal_percentage,
        granted30Days: stat.granted_30_days,
        withdrawn30Days: stat.withdrawn_30_days,
      })),
    })
  } catch (error: unknown) {
    console.error('[admin-privacy-metrics] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
