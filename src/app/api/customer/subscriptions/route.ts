import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/subscriptions
 * Returns customer's active subscription with credit balance
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select(`
        *,
        plan:service_plans(*)
      `)
      .eq('customer_id', user.id)
      .in('status', ['active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('[GET /api/customer/subscriptions] Error:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
    }

    // Get recent credit transactions
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (txError) {
      console.error('[GET /api/customer/subscriptions] Transaction error:', txError)
    }

    return NextResponse.json({
      subscription: subscription || null,
      recent_transactions: transactions || [],
      has_subscription: !!subscription
    })
  } catch (error) {
    console.error('[GET /api/customer/subscriptions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/customer/subscriptions
 * Enroll customer in a subscription plan
 *
 * Body: {
 *   plan_id: string,
 *   stripe_subscription_id?: string,
 *   stripe_customer_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id, stripe_subscription_id, stripe_customer_id } = body

    if (!plan_id) {
      return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })
    }

    // Check if customer already has an active subscription
    const { data: existing, error: checkError } = await supabase
      .from('customer_subscriptions')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Customer already has an active subscription' },
        { status: 409 }
      )
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('plan_type', 'subscription')
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 400 })
    }

    // Calculate billing cycle
    const now = new Date()
    const billingCycleStart = now
    const billingCycleEnd = new Date(now)

    if (plan.billing_cycle === 'annual') {
      billingCycleEnd.setFullYear(billingCycleEnd.getFullYear() + 1)
    } else {
      // Default to monthly
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1)
    }

    const nextBillingDate = new Date(billingCycleEnd)

    // Create subscription using service role
    const { data: newSubscription, error: insertError } = await supabaseAdmin
      .from('customer_subscriptions')
      .insert({
        customer_id: user.id,
        plan_id: plan_id,
        stripe_subscription_id: stripe_subscription_id || null,
        stripe_customer_id: stripe_customer_id || null,
        status: 'active',
        current_credits: plan.credit_allocation || 0,
        total_credits_allocated: plan.credit_allocation || 0,
        billing_cycle_start: billingCycleStart.toISOString(),
        billing_cycle_end: billingCycleEnd.toISOString(),
        next_billing_date: nextBillingDate.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/customer/subscriptions] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    // Record initial credit allocation
    await supabaseAdmin
      .from('credit_transactions')
      .insert({
        customer_id: user.id,
        subscription_id: newSubscription.id,
        transaction_type: 'allocation',
        amount: plan.credit_allocation || 0,
        balance_after: plan.credit_allocation || 0,
        description: `Initial allocation of ${plan.credit_allocation} credits for ${plan.name}`
      })

    console.log(`[POST /api/customer/subscriptions] Created subscription for user ${user.id}:`, newSubscription.id)

    return NextResponse.json(newSubscription, { status: 201 })
  } catch (error) {
    console.error('[POST /api/customer/subscriptions] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
