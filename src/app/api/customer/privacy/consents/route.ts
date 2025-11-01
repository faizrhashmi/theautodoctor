import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
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

    // Get all consents for this customer
    const { data: consents, error: consentsError } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (consentsError) {
      console.error('[consents] Error fetching consents:', consentsError)
      return NextResponse.json(
        { error: 'Failed to fetch consents' },
        { status: 500 }
      )
    }

    // Get consent summary
    const { data: summary, error: summaryError } = await supabase
      .from('customer_consent_summary')
      .select('*')
      .eq('customer_id', user.id)
      .single()

    if (summaryError) {
      console.error('[consents] Error fetching summary:', summaryError)
    }

    // Transform data for frontend
    const transformedConsents = consents.map(consent => ({
      id: consent.id,
      consentType: consent.consent_type,
      consentGranted: consent.consent_granted,
      consentVersion: consent.consent_version,
      grantedAt: consent.granted_at,
      withdrawnAt: consent.withdrawn_at,
      consentMethod: consent.consent_method,
      ipAddress: consent.ip_address,
      userAgent: consent.user_agent,
    }))

    return NextResponse.json({
      consents: transformedConsents,
      summary: summary ? {
        hasTermsConsent: summary.has_terms_consent,
        hasPrivacyConsent: summary.has_privacy_consent,
        hasMarketplaceConsent: summary.has_marketplace_consent,
        hasMarketingConsent: summary.has_marketing_consent,
        hasAnalyticsConsent: summary.has_analytics_consent,
        hasAllRequiredConsents: summary.has_all_required_consents,
      } : null,
    })
  } catch (error: any) {
    console.error('[consents] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
