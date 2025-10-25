import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      fullName,
      phone,
      address,
      preferredLanguage,
      newsletterSubscribed,
      referralSource,
      vehicleInfo,
      waiverAccepted,
      is18Plus,
    } = body

    // Validation
    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!waiverAccepted || !is18Plus) {
      return NextResponse.json(
        { error: 'You must be 18+ and accept the terms to sign up' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'customer',
        account_type: 'individual_customer', // For B2C → B2B2C transition tracking
        source: 'direct', // Track signup source
      },
    })

    if (authError) {
      console.error('[signup] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Wait a moment for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 100))

    // Upsert profile with additional info (trigger should have created it, but we ensure it exists)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        phone,
        role: 'customer',
        // Account type tracking (for B2C → B2B2C transition)
        account_type: 'individual_customer',
        source: 'direct',
        organization_id: null,
        referred_by_workshop_id: null,
        // Address fields
        address_line1: address?.line1,
        address_line2: address?.line2,
        city: address?.city,
        state_province: address?.state,
        postal_zip_code: address?.postalCode,
        country: address?.country,
        // Preferences
        preferred_language: preferredLanguage || 'en',
        newsletter_subscribed: newsletterSubscribed || false,
        referral_source: referralSource,
        communication_preferences: {
          email: true,
          sms: true,
          push: true,
        },
        // Vehicle info
        vehicle_info: vehicleInfo || {},
        // Legal
        is_18_plus: true,
        waiver_accepted: true,
        waiver_accepted_at: new Date().toISOString(),
        waiver_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        // Status
        email_verified: false,
        account_status: 'active',
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('[signup] Profile upsert error:', profileError)
      // Don't fail the whole signup if profile update fails
    }

    // Log waiver acceptance
    await supabaseAdmin.from('waiver_acceptances').insert({
      user_id: authData.user.id,
      waiver_version: 'v1.0',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    })

    // Send verification email (Supabase handles this automatically)
    // You can customize the email template in Supabase Dashboard → Authentication → Email Templates

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Account created! Please check your email to verify your account.',
    })
  } catch (error: any) {
    console.error('[signup] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
