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

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const consentVersion = 'v1.0.0'

    // Grant consent using database function (uses admin client for function call)
    const { data, error } = await supabaseAdmin.rpc('grant_customer_consent', {
      p_customer_id: user.id,
      p_consent_type: consentType,
      p_consent_version: consentVersion,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_consent_method: 'settings_page',
      p_consent_text: null,
    })

    if (error) {
      console.error('[grant-consent] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to grant consent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      consentId: data,
      message: `Successfully granted consent for ${consentType}`,
    })
  } catch (error: any) {
    console.error('[grant-consent] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
