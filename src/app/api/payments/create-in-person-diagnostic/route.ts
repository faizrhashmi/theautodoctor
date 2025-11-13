/**
 * POST /api/payments/create-in-person-diagnostic
 * Create Stripe payment intent for in-person diagnostic with diagnostic credit support
 *
 * Flow Scenarios:
 *
 * 1. NEW DIAGNOSTIC (No Credit):
 *    - Customer books in-person diagnostic ($75)
 *    - Pays full amount via Stripe
 *    - Commission split: 70% to mechanic, 30% to platform
 *
 * 2. IN-PERSON FOLLOW-UP (Full Credit - FREE):
 *    - Customer had $75 video diagnostic
 *    - Mechanic marked requires_in_person_follow_up = true
 *    - In-person diagnostic also $75
 *    - Customer pays $0 (credit covers full amount)
 *    - No Stripe payment intent created
 *    - Appointment created with credit applied
 *
 * 3. IN-PERSON FOLLOW-UP (Partial Credit):
 *    - Customer had $50 video diagnostic
 *    - Mechanic marked requires_in_person_follow_up = true
 *    - In-person diagnostic is $75
 *    - Customer pays $25 (difference)
 *    - Commission split on $25: 70% to mechanic, 30% to platform
 *    - Appointment tracks both credit_amount ($50) and payment ($25)
 *
 * Request Body:
 * {
 *   mechanicId: UUID (mechanic user_id),
 *   appointmentId?: UUID (workshop_appointment ID if already created),
 *   parentDiagnosticSessionId?: UUID (for follow-up with credit),
 *   applyCredit: boolean (whether to apply diagnostic credit),
 *   metadata?: object (additional payment metadata)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

const PLATFORM_COMMISSION_PERCENT = 30 // 30% platform fee for diagnostics
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
      appointmentId, // Optional: if appointment already created
      parentDiagnosticSessionId, // Optional: for follow-up with credit
      applyCredit = false,
      metadata = {}
    } = body

    if (!mechanicId) {
      return NextResponse.json({ error: 'Mechanic ID is required' }, { status: 400 })
    }

    // 3. Get mechanic's Stripe account ID and diagnostic pricing
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        stripe_account_id,
        user_id,
        name,
        email
      `)
      .eq('user_id', mechanicId)
      .single()

    if (mechanicError || !mechanic) {
      console.error('[create-in-person-diagnostic] Mechanic not found:', mechanicError)
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // 4. Get mechanic's in-person diagnostic pricing
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('mechanic_diagnostic_pricing')
      .select('in_person_diagnostic_price, in_person_diagnostic_description')
      .eq('mechanic_id', mechanic.id)
      .single()

    if (pricingError || !pricing) {
      console.error('[create-in-person-diagnostic] Pricing not found:', pricingError)
      return NextResponse.json({
        error: 'Mechanic has not set in-person diagnostic pricing',
        code: 'PRICING_NOT_SET'
      }, { status: 400 })
    }

    const diagnosticPriceCents = Math.round(pricing.in_person_diagnostic_price * 100)

    // 5. Check for valid diagnostic credit (if applying)
    let creditAmount = 0
    let creditSessionId = null

    if (applyCredit && parentDiagnosticSessionId) {
      // Use helper function to check credit validity
      const { data: creditData, error: creditError } = await supabaseAdmin.rpc(
        'check_diagnostic_credit_validity',
        {
          p_customer_id: user.id,
          p_mechanic_id: mechanic.id,
        }
      )

      if (creditError) {
        console.error('[create-in-person-diagnostic] Credit check error:', creditError)
        return NextResponse.json({
          error: 'Failed to validate diagnostic credit',
        }, { status: 500 })
      }

      const creditInfo = creditData?.[0]

      // Verify credit is valid and matches parent session
      if (creditInfo?.has_credit && creditInfo.session_id === parentDiagnosticSessionId) {
        creditAmount = Math.round(creditInfo.credit_amount * 100) // Convert to cents
        creditSessionId = creditInfo.session_id
        console.log('[create-in-person-diagnostic] Valid credit found:', {
          creditAmount,
          sessionId: creditSessionId,
          expiresAt: creditInfo.expires_at,
        })
      } else {
        return NextResponse.json({
          error: 'Diagnostic credit is invalid, expired, or already used',
          code: 'INVALID_CREDIT'
        }, { status: 400 })
      }
    }

    // 6. Calculate amount customer needs to pay
    const amountToPayCents = Math.max(0, diagnosticPriceCents - creditAmount)
    const amountToPayDollars = amountToPayCents / 100
    const creditAmountDollars = creditAmount / 100

    console.log('[create-in-person-diagnostic] Payment calculation:', {
      diagnosticPrice: diagnosticPriceCents / 100,
      creditAmount: creditAmountDollars,
      amountToPay: amountToPayDollars,
      isFree: amountToPayCents === 0,
    })

    // 7. If credit covers full amount, no payment needed
    if (amountToPayCents === 0) {
      return NextResponse.json({
        isFree: true,
        creditApplied: true,
        creditAmount: creditAmountDollars,
        diagnosticPrice: diagnosticPriceCents / 100,
        amountToPay: 0,
        parentSessionId: creditSessionId,
        message: 'Your diagnostic credit covers the full cost. No payment required!',
      })
    }

    // 8. Check if mechanic has Stripe Connect onboarded (only if payment needed)
    if (!mechanic.stripe_account_id) {
      return NextResponse.json({
        error: 'Mechanic has not completed payment setup. Please select a different mechanic.',
        code: 'MECHANIC_NOT_ONBOARDED'
      }, { status: 400 })
    }

    // 9. Verify Stripe account is active
    try {
      const stripeAccount = await stripe.accounts.retrieve(mechanic.stripe_account_id)

      if (!stripeAccount.charges_enabled) {
        return NextResponse.json({
          error: 'Mechanic payment account is not active. Please select a different mechanic.',
          code: 'MECHANIC_ACCOUNT_INACTIVE'
        }, { status: 400 })
      }
    } catch (stripeError: any) {
      console.error('[create-in-person-diagnostic] Stripe account error:', stripeError)
      return NextResponse.json({
        error: 'Unable to verify mechanic payment setup',
        code: 'STRIPE_ACCOUNT_ERROR'
      }, { status: 500 })
    }

    // 10. Get or create customer's Stripe customer ID
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

    // 11. Calculate commission split (on amount to pay, not credit)
    const mechanicAmount = Math.round(amountToPayCents * (MECHANIC_PERCENT / 100))
    const platformCommission = amountToPayCents - mechanicAmount

    // 12. Create Stripe Payment Intent with destination charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountToPayCents,
      currency: 'cad',
      customer: stripeCustomerId,
      transfer_data: {
        destination: mechanic.stripe_account_id,
        amount: mechanicAmount
      },
      metadata: {
        type: applyCredit ? 'in_person_follow_up' : 'new_diagnostic',
        customer_user_id: user.id,
        mechanic_id: mechanic.id,
        mechanic_user_id: mechanicId,
        appointment_id: appointmentId || 'pending',
        parent_diagnostic_session_id: creditSessionId || 'none',
        diagnostic_price_cents: diagnosticPriceCents,
        credit_applied_cents: creditAmount,
        amount_charged_cents: amountToPayCents,
        platform_commission: platformCommission,
        platform_commission_percent: PLATFORM_COMMISSION_PERCENT,
        ...metadata
      },
      description: applyCredit
        ? `In-Person Follow-Up Diagnostic - Mechanic: ${mechanic.name || mechanic.email} (Credit: $${creditAmountDollars})`
        : `In-Person Diagnostic - Mechanic: ${mechanic.name || mechanic.email}`,
      statement_descriptor: 'AutoDoctor Diag',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Prevent redirect-based payment methods
      }
    })

    console.log('[create-in-person-diagnostic] Payment intent created:', {
      paymentIntentId: paymentIntent.id,
      diagnosticPrice: diagnosticPriceCents / 100,
      creditApplied: creditAmountDollars,
      amountCharged: amountToPayCents / 100,
      mechanicAmount: mechanicAmount / 100,
      platformCommission: platformCommission / 100,
      mechanicStripeAccount: mechanic.stripe_account_id
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isFree: false,
      creditApplied: applyCredit,
      diagnosticPrice: diagnosticPriceCents / 100,
      creditAmount: creditAmountDollars,
      amountToPay: amountToPayCents / 100,
      mechanicAmount: mechanicAmount / 100,
      platformCommission: platformCommission / 100,
      mechanicName: mechanic.name || 'Mechanic',
      parentSessionId: creditSessionId,
    })

  } catch (error: any) {
    console.error('[create-in-person-diagnostic] Error:', error)

    return NextResponse.json({
      error: error.message || 'Failed to create payment',
      code: 'PAYMENT_CREATION_ERROR'
    }, { status: 500 })
  }
}
