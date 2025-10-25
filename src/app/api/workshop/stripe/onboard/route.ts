import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

/**
 * Get workshop organization from session cookie
 * Workshops use Supabase Auth (unlike mechanics who use custom auth)
 */
async function getWorkshopFromSession(req: NextRequest) {
  const cookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-auth-token'
  const authToken = req.cookies.get(cookieName)?.value

  if (!authToken) {
    console.log('[workshop-stripe] No auth token found in cookies')
    return null
  }

  try {
    // Parse the auth token to get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)

    if (userError || !user) {
      console.log('[workshop-stripe] Failed to get user from token:', userError)
      return null
    }

    // Get workshop organization for this user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        organization_id,
        role,
        organizations (
          id,
          name,
          email,
          organization_type,
          status,
          stripe_connect_account_id,
          stripe_onboarding_completed,
          stripe_charges_enabled,
          stripe_payouts_enabled
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !member || !member.organizations) {
      console.log('[workshop-stripe] No active workshop membership found')
      return null
    }

    // Ensure this is a workshop organization
    if (member.organizations.organization_type !== 'workshop') {
      console.log('[workshop-stripe] Organization is not a workshop')
      return null
    }

    return {
      organization_id: member.organizations.id,
      name: member.organizations.name,
      email: member.organizations.email,
      stripe_connect_account_id: member.organizations.stripe_connect_account_id,
      stripe_onboarding_completed: member.organizations.stripe_onboarding_completed,
      role: member.role,
    }
  } catch (error) {
    console.error('[workshop-stripe] Error getting workshop:', error)
    return null
  }
}

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
    // 1. Authenticate workshop
    const workshop = await getWorkshopFromSession(request)

    if (!workshop) {
      return NextResponse.json({ error: 'Unauthorized - Please log in as a workshop owner/admin' }, { status: 401 })
    }

    // Only owners and admins can set up payments
    if (workshop.role !== 'owner' && workshop.role !== 'admin') {
      return NextResponse.json({ error: 'Only workshop owners/admins can set up payments' }, { status: 403 })
    }

    let stripeAccountId = workshop.stripe_connect_account_id

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
          name: workshop.name,
        },
        metadata: {
          workshop_id: workshop.organization_id,
          platform: 'askautodoctor',
          organization_type: 'workshop',
        },
      })

      stripeAccountId = account.id

      // Store Stripe account ID in organizations table
      const { error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ stripe_connect_account_id: stripeAccountId })
        .eq('id', workshop.organization_id)

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

    console.log('[workshop-stripe] Created account link for workshop:', workshop.organization_id)

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
    const workshop = await getWorkshopFromSession(request)

    if (!workshop) {
      return NextResponse.json({ error: 'Unauthorized - Please log in as a workshop owner/admin' }, { status: 401 })
    }

    if (!workshop.stripe_connect_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      })
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(workshop.stripe_connect_account_id)

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
      .eq('id', workshop.organization_id)

    console.log('[workshop-stripe] Retrieved status for workshop:', workshop.organization_id, {
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
    })

    return NextResponse.json({
      connected: true,
      onboarding_completed: onboardingCompleted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: workshop.stripe_connect_account_id,
    })
  } catch (error) {
    console.error('[workshop-stripe] Failed to check Stripe status:', error)
    const message = error instanceof Error ? error.message : 'Failed to check Stripe status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
