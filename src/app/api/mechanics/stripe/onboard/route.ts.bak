import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

/**
 * Get mechanic from custom auth system (aad_mech cookie)
 */
async function getMechanicFromCookie(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value
  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, email, name, stripe_account_id')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

/**
 * POST /api/mechanics/stripe/onboard
 * Creates a Stripe Connect Express account for a mechanic and returns onboarding link
 *
 * Flow:
 * 1. Verify mechanic is authenticated (custom auth system)
 * 2. Create or retrieve Stripe Connect Express account
 * 3. Generate account onboarding link
 * 4. Return link for redirect
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate mechanic using custom auth system
    const mechanic = await getMechanicFromCookie(request)

    if (!mechanic) {
      return NextResponse.json({ error: 'Unauthorized - Please log in as a mechanic' }, { status: 401 })
    }

    let stripeAccountId = mechanic.stripe_account_id

    // 2. Create Stripe Connect Express account if not exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: mechanic.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          product_description: 'Automotive diagnostic and consultation services',
          mcc: '7538', // Automotive service shops
        },
        metadata: {
          mechanic_id: mechanic.id,
          platform: 'askautodoctor',
        },
      })

      stripeAccountId = account.id

      // Store Stripe account ID in mechanics table
      const { error: updateError } = await supabaseAdmin
        .from('mechanics')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', mechanic.id)

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
export async function GET(request: NextRequest) {
  try {
    const mechanic = await getMechanicFromCookie(request)

    if (!mechanic) {
      return NextResponse.json({ error: 'Unauthorized - Please log in as a mechanic' }, { status: 401 })
    }

    if (!mechanic.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      })
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(mechanic.stripe_account_id)

    const onboardingCompleted = account.details_submitted || false
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false

    // Update mechanics table with latest status
    await supabaseAdmin
      .from('mechanics')
      .update({
        stripe_onboarding_completed: onboardingCompleted,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_details_submitted: account.details_submitted || false,
      })
      .eq('id', mechanic.id)

    return NextResponse.json({
      connected: true,
      onboarding_completed: onboardingCompleted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: mechanic.stripe_account_id,
    })
  } catch (error) {
    console.error('Failed to check Stripe status', error)
    const message = error instanceof Error ? error.message : 'Failed to check Stripe status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
