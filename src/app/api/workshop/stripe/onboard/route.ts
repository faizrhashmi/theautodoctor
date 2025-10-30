import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * POST /api/workshop/stripe/onboard
 * Creates a Stripe Connect Express account for a workshop and returns onboarding link
 *
 * Flow:
 * 1. Verify workshop owner/admin is authenticated
 * 2. Create or retrieve Stripe Connect Express account
 * 3. Generate account onboarding link
 * 4. Return link for redirect
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(request)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) setting up Stripe onboarding`)

    // Only owners and admins can set up payments
    if (workshop.role !== 'owner' && workshop.role !== 'admin') {
      return NextResponse.json({ error: 'Only workshop owners/admins can set up payments' }, { status: 403 })
    }

    // Get current Stripe account ID from database
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('stripe_connect_account_id')
      .eq('id', workshop.organizationId)
      .single()

    if (orgError) {
      console.error('[workshop-stripe] Failed to get organization:', orgError)
      return NextResponse.json({ error: 'Failed to get workshop details' }, { status: 500 })
    }

    let stripeAccountId = org?.stripe_connect_account_id

    // 2. Create Stripe Connect Express account if not exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: workshop.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'company', // Workshops are typically businesses
        business_profile: {
          product_description: 'Automotive repair and diagnostic services',
          mcc: '7538', // Automotive service shops
          name: workshop.organizationName,
        },
        metadata: {
          workshop_id: workshop.organizationId,
          platform: 'askautodoctor',
          organization_type: 'workshop',
        },
      })

      stripeAccountId = account.id

      // Store Stripe account ID in organizations table
      const { error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ stripe_connect_account_id: stripeAccountId })
        .eq('id', workshop.organizationId)

      if (updateError) {
        console.error('[workshop-stripe] Failed to save Stripe account ID:', updateError)
        // Continue anyway - we have the account created
      }

      console.log('[workshop-stripe] Created Stripe Connect account:', stripeAccountId)
    }

    // 3. Create onboarding link
    const origin = request.nextUrl.origin
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/workshop/dashboard?stripe_refresh=true`,
      return_url: `${origin}/workshop/dashboard?stripe_complete=true`,
      type: 'account_onboarding',
    })

    console.log('[workshop-stripe] Created account link for workshop:', workshop.organizationId)

    return NextResponse.json({
      url: accountLink.url,
      account_id: stripeAccountId,
    })
  } catch (error) {
    console.error('[workshop-stripe] Stripe Connect onboarding error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create Stripe account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/workshop/stripe/onboard
 * Check current Stripe Connect onboarding status
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(request)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) checking Stripe status`)

    // Get current Stripe account ID from database
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('stripe_connect_account_id')
      .eq('id', workshop.organizationId)
      .single()

    if (orgError) {
      console.error('[workshop-stripe] Failed to get organization:', orgError)
      return NextResponse.json({ error: 'Failed to get workshop details' }, { status: 500 })
    }

    if (!org?.stripe_connect_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      })
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(org.stripe_connect_account_id)

    const onboardingCompleted = account.details_submitted || false
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false

    // Update organizations table with latest status
    await supabaseAdmin
      .from('organizations')
      .update({
        stripe_onboarding_completed: onboardingCompleted,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_details_submitted: account.details_submitted || false,
      })
      .eq('id', workshop.organizationId)

    console.log('[workshop-stripe] Retrieved status for workshop:', workshop.organizationId, {
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
    })

    return NextResponse.json({
      connected: true,
      onboarding_completed: onboardingCompleted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: org.stripe_connect_account_id,
    })
  } catch (error) {
    console.error('[workshop-stripe] Failed to check Stripe status:', error)
    const message = error instanceof Error ? error.message : 'Failed to check Stripe status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
