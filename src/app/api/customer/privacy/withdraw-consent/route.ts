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
    const { consentType } = body

    if (!consentType) {
      return NextResponse.json(
        { error: 'Consent type is required' },
        { status: 400 }
      )
    }

    // Prevent withdrawing required consents
    const requiredConsents = ['terms_of_service', 'privacy_policy', 'marketplace_understanding']
    if (requiredConsents.includes(consentType)) {
      return NextResponse.json(
        { error: 'Cannot withdraw required consents. Please delete your account if you wish to revoke all consents.' },
        { status: 400 }
      )
    }

    // Withdraw consent using database function (uses admin client for function call)
    const { data, error } = await supabaseAdmin.rpc('withdraw_customer_consent', {
      p_customer_id: user.id,
      p_consent_type: consentType,
    })

    if (error) {
      console.error('[withdraw-consent] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to withdraw consent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully withdrew consent for ${consentType}`,
    })
  } catch (error: any) {
    console.error('[withdraw-consent] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
