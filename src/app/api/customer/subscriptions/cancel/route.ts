import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/customer/subscriptions/cancel
 * Cancel customer's subscription
 *
 * Body: {
 *   cancel_immediately?: boolean,  // If false, cancels at period end
 *   reason?: string
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
    const { cancel_immediately = false, reason } = body

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Update subscription
    const updates: any = {
      canceled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Customer requested cancellation'
    }

    if (cancel_immediately) {
      updates.status = 'canceled'
      updates.ended_at = new Date().toISOString()
      updates.current_credits = 0 // Forfeit remaining credits
    } else {
      updates.cancel_at_period_end = true
      updates.auto_renew = false
    }

    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('customer_subscriptions')
      .update(updates)
      .eq('id', subscription.id)
      .select()
      .single()

    if (updateError) {
      console.error('[POST /api/customer/subscriptions/cancel] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }

    // Record credit expiration if canceling immediately
    if (cancel_immediately && subscription.current_credits > 0) {
      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          customer_id: user.id,
          subscription_id: subscription.id,
          transaction_type: 'expiration',
          amount: -subscription.current_credits,
          balance_after: 0,
          description: `Subscription canceled - ${subscription.current_credits} credits forfeited`
        })
    }

    console.log(`[POST /api/customer/subscriptions/cancel] Canceled subscription ${subscription.id} for user ${user.id}`)

    return NextResponse.json({
      message: cancel_immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of billing period',
      subscription: updatedSubscription
    })
  } catch (error) {
    console.error('[POST /api/customer/subscriptions/cancel] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
