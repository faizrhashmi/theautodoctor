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

    // Get user's profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'workshop' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workshop users can sign agreements' },
        { status: 403 }
      )
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: 'No organization associated with this account' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { electronicSignature, sectionsAccepted, insurance, businessRegistration } = body

    // Validation
    if (!electronicSignature || electronicSignature.trim().length < 2) {
      return NextResponse.json(
        { error: 'Electronic signature is required (minimum 2 characters)' },
        { status: 400 }
      )
    }

    // Validate all required sections are accepted
    const requiredSections = ['independent_contractor', 'insurance', 'ocpa_compliance', 'privacy', 'quality', 'platform_fees']
    for (const section of requiredSections) {
      if (!sectionsAccepted[section]) {
        return NextResponse.json(
          { error: `Required section "${section}" must be accepted` },
          { status: 400 }
        )
      }
    }

    // Validate insurance details
    if (!insurance?.provider || !insurance?.policyNumber) {
      return NextResponse.json(
        { error: 'Insurance provider and policy number are required' },
        { status: 400 }
      )
    }

    const coverageAmount = parseFloat(insurance.coverageAmount)
    if (isNaN(coverageAmount) || coverageAmount < 2000000) {
      return NextResponse.json(
        { error: 'Insurance coverage must be at least $2,000,000 CAD' },
        { status: 400 }
      )
    }

    const expiryDate = new Date(insurance.expiryDate)
    if (expiryDate <= new Date()) {
      return NextResponse.json(
        { error: 'Insurance certificate must not be expired' },
        { status: 400 }
      )
    }

    const effectiveDate = new Date(insurance.effectiveDate)
    if (effectiveDate > new Date()) {
      return NextResponse.json(
        { error: 'Insurance certificate must be currently effective' },
        { status: 400 }
      )
    }

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Sign the agreement using database function
    const { data: agreementId, error: agreementError } = await supabaseAdmin.rpc('sign_workshop_agreement', {
      p_organization_id: profile.organization_id,
      p_signed_by: user.id,
      p_electronic_signature: electronicSignature.trim(),
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_agreement_type: 'independent_contractor',
      p_agreement_version: 'v1.0.0',
      p_sections_accepted: sectionsAccepted,
    })

    if (agreementError) {
      console.error('[sign-agreement] Database error:', agreementError)
      return NextResponse.json(
        { error: agreementError.message || 'Failed to sign agreement' },
        { status: 500 }
      )
    }

    // Upload insurance certificate
    const { data: insuranceLogId, error: insuranceError } = await supabaseAdmin.rpc('upload_insurance_certificate', {
      p_organization_id: profile.organization_id,
      p_uploaded_by: user.id,
      p_certificate_url: insurance.certificateUrl || null,
      p_provider: insurance.provider,
      p_policy_number: insurance.policyNumber,
      p_coverage_amount: coverageAmount,
      p_effective_date: insurance.effectiveDate,
      p_expiry_date: insurance.expiryDate,
      p_ip_address: ipAddress,
    })

    if (insuranceError) {
      console.error('[sign-agreement] Insurance upload error:', insuranceError)
      // Don't fail the whole agreement if insurance upload fails
    }

    // Update organization with business registration details
    if (businessRegistration?.businessNumber || businessRegistration?.gstHstNumber) {
      await supabaseAdmin
        .from('organizations')
        .update({
          business_number: businessRegistration.businessNumber || null,
          tax_id: businessRegistration.gstHstNumber || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.organization_id)
    }

    // Update agreement with business registration info
    await supabaseAdmin
      .from('workshop_agreements')
      .update({
        business_registration_verified: !!businessRegistration?.businessNumber,
        business_number: businessRegistration?.businessNumber || null,
        gst_hst_number: businessRegistration?.gstHstNumber || null,
        wsib_required: businessRegistration?.wsibRequired || false,
        wsib_account_number: businessRegistration?.wsibAccountNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId)

    return NextResponse.json({
      success: true,
      agreementId,
      insuranceLogId,
      message: 'Agreement signed successfully',
      nextSteps: [
        'Your agreement has been signed and recorded',
        'Insurance certificate will be verified by our team',
        'You can now access the workshop dashboard',
        'Complete your workshop profile to start receiving customer requests',
      ],
    })
  } catch (error: any) {
    console.error('[sign-agreement] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
