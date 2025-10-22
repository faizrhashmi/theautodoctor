import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/mechanics/stripe/onboard
 * Creates a Stripe Connect Express account for a mechanic and returns onboarding link
 *
 * Flow:
 * 1. Verify user is a mechanic
 * 2. Create or retrieve Stripe Connect Express account
 * 3. Generate account onboarding link
 * 4. Return link for redirect
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and verify mechanic
    const supabase = getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, stripe_account_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'mechanic') {
      return NextResponse.json({ error: 'Mechanic access required' }, { status: 403 })
    }

    let stripeAccountId = profile.stripe_account_id

    // 2. Create Stripe Connect Express account if not exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          product_description: 'Automotive diagnostic and consultation services',
          mcc: '7538', // Automotive service shops
        },
        metadata: {
          mechanic_id: user.id,
          platform: 'askautodoctor',
        },
      })

      stripeAccountId = account.id

      // Store Stripe account ID in database
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to save Stripe account ID', updateError)
        // Continue anyway - we have the account created
      }
    }

    // 3. Create onboarding link
    const origin = request.nextUrl.origin
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/mechanic/onboarding/stripe?refresh=true`,
      return_url: `${origin}/mechanic/onboarding/stripe/complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: accountLink.url,
      account_id: stripeAccountId,
    })
  } catch (error) {
    console.error('Stripe Connect onboarding error', error)
    const message = error instanceof Error ? error.message : 'Failed to create Stripe account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/stripe/onboard
 * Check current Stripe Connect onboarding status
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'mechanic') {
      return NextResponse.json({ error: 'Mechanic access required' }, { status: 403 })
    }

    if (!profile.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      })
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    const onboardingCompleted = account.details_submitted || false
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false

    // Update our database with latest status
    await supabaseAdmin
      .from('profiles')
      .update({
        stripe_onboarding_completed: onboardingCompleted,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_details_submitted: account.details_submitted || false,
      })
      .eq('id', user.id)

    return NextResponse.json({
      connected: true,
      onboarding_completed: onboardingCompleted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: profile.stripe_account_id,
    })
  } catch (error) {
    console.error('Failed to check Stripe status', error)
    const message = error instanceof Error ? error.message : 'Failed to check Stripe status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
