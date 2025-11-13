/**
 * POST /api/payments/create-inspection
 * Create Stripe payment intent for in-person inspection fee
 *
 * Flow:
 * 1. Customer books in-person inspection ($50)
 * 2. Platform charges customer via Stripe
 * 3. Commission automatically split: 70% to mechanic, 30% to platform
 * 4. Uses Stripe Connect destination charges for automatic commission
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

const INSPECTION_FEE = 5000 // $50 in cents
const PLATFORM_COMMISSION_PERCENT = 30 // 30% platform fee
const MECHANIC_PERCENT = 70 // 70% to mechanic

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      mechanicId, // mechanic user_id
      sessionId, // Optional: if session already created
      metadata = {}
    } = body

    if (!mechanicId) {
      return NextResponse.json({ error: 'Mechanic ID is required' }, { status: 400 })
    }

    // 3. Get mechanic's Stripe account ID
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, stripe_account_id, user_id, name, email')
      .eq('user_id', mechanicId)
      .single()

    if (mechanicError || !mechanic) {
      console.error('[create-inspection] Mechanic not found:', mechanicError)
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // 4. Check if mechanic has Stripe Connect onboarded
    if (!mechanic.stripe_account_id) {
      return NextResponse.json({
        error: 'Mechanic has not completed payment setup. Please select a different mechanic.',
        code: 'MECHANIC_NOT_ONBOARDED'
      }, { status: 400 })
    }

    // 5. Verify Stripe account is active
    try {
      const stripeAccount = await stripe.accounts.retrieve(mechanic.stripe_account_id)

      if (!stripeAccount.charges_enabled) {
        return NextResponse.json({
          error: 'Mechanic payment account is not active. Please select a different mechanic.',
          code: 'MECHANIC_ACCOUNT_INACTIVE'
        }, { status: 400 })
      }
    } catch (stripeError: any) {
      console.error('[create-inspection] Stripe account error:', stripeError)
      return NextResponse.json({
        error: 'Unable to verify mechanic payment setup',
        code: 'STRIPE_ACCOUNT_ERROR'
      }, { status: 500 })
    }

    // 6. Get or create customer's Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, full_name, email')
      .eq('id', user.id)
      .single()

    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name,
        metadata: {
          user_id: user.id,
          platform: 'askautodoctor'
        }
      })

      stripeCustomerId = customer.id

      // Save to database
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    // 7. Calculate commission split
    const mechanicAmount = Math.round(INSPECTION_FEE * (MECHANIC_PERCENT / 100))
    const platformCommission = INSPECTION_FEE - mechanicAmount

    // 8. Create Stripe Payment Intent with destination charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: INSPECTION_FEE,
      currency: 'cad',
      customer: stripeCustomerId,
      transfer_data: {
        destination: mechanic.stripe_account_id,
        amount: mechanicAmount // $35 to mechanic
      },
      metadata: {
        type: 'in_person_inspection',
        customer_user_id: user.id,
        mechanic_id: mechanic.id,
        mechanic_user_id: mechanicId,
        session_id: sessionId || 'pending',
        platform_commission: platformCommission,
        platform_commission_percent: PLATFORM_COMMISSION_PERCENT,
        ...metadata
      },
      description: `In-Person Vehicle Inspection - Mechanic: ${mechanic.name || mechanic.email}`,
      statement_descriptor: 'AutoDoctor Inspect',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Prevent redirect-based payment methods
      }
    })

    console.log('[create-inspection] Payment intent created:', {
      paymentIntentId: paymentIntent.id,
      amount: INSPECTION_FEE,
      mechanicAmount,
      platformCommission,
      mechanicStripeAccount: mechanic.stripe_account_id
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: INSPECTION_FEE,
      mechanicAmount,
      platformCommission,
      mechanicName: mechanic.name || 'Mechanic'
    })

  } catch (error: any) {
    console.error('[create-inspection] Error:', error)

    return NextResponse.json({
      error: error.message || 'Failed to create payment',
      code: 'PAYMENT_CREATION_ERROR'
    }, { status: 500 })
  }
}
