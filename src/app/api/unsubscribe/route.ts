/**
 * H1: UNSUBSCRIBE API (CASL Compliance)
 *
 * POST /api/unsubscribe
 * Body: { email: string, token?: string }
 *
 * Sets email_marketing_opt_in = false
 * Logs consent change for audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, token } = body as { email: string; token?: string }

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Get IP address for audit log
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Find user by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, email_marketing_opt_in')
      .eq('email', email)
      .maybeSingle()

    if (profileError || !profile) {
      // Still return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: 'If this email is in our system, it has been unsubscribed.',
      })
    }

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email_marketing_opt_in: false,
        consent_timestamp: new Date().toISOString(),
        consent_ip: ip,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[unsubscribe] Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    // Log consent change
    const { error: logError } = await supabaseAdmin.from('email_consent_log').insert({
      user_id: profile.id,
      email: email,
      consent_given: false,
      ip_address: ip,
      method: token ? 'unsubscribe_link' : 'unsubscribe_page',
      user_agent: userAgent,
      metadata: {
        previous_value: profile.email_marketing_opt_in,
        unsubscribed_at: new Date().toISOString(),
      },
    })

    if (logError) {
      console.error('[unsubscribe] Error logging consent change:', logError)
    }

    console.log(`[unsubscribe] ✓ Unsubscribed: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
    })
  } catch (error: any) {
    console.error('[unsubscribe] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
