import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * CRON JOB: Monthly Credit Allocation
 *
 * Purpose: Allocate monthly credits to active subscription customers
 *
 * This endpoint should be called monthly (recommended: 1st of each month at 00:00 UTC) by:
 * - Vercel Cron Jobs
 * - External cron service (e.g., cron-job.org)
 * - Supabase pg_cron extension
 *
 * Process:
 * 1. Find active subscriptions with next_billing_date in the past
 * 2. Calculate rollover credits (capped by max_rollover_credits)
 * 3. Allocate new monthly credits from plan
 * 4. Record rollover and allocation transactions
 * 5. Update subscription with new credits and next_billing_date
 *
 * Authentication:
 * - Verifies cron secret to prevent unauthorized access
 * - Set CRON_SECRET env variable for security
 *
 * Returns:
 * - Count of processed subscriptions
 * - Total credits allocated
 * - Any errors encountered
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface AllocationResult {
  subscription_id: string
  customer_id: string
  credits_before: number
  rollover_credits: number
  new_credits: number
  credits_after: number
  expired_credits: number
  next_billing_date: string
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[allocate-credits] Unauthorized cron attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.warn('[allocate-credits] CRON_SECRET not set - cron endpoint is unprotected!')
    }

    console.log('[allocate-credits] Starting monthly credit allocation...')

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not available' },
        { status: 500 }
      )
    }

    // Find all active subscriptions that need credit allocation
    // (next_billing_date is in the past or today)
    const now = new Date()
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        id,
        customer_id,
        plan_id,
        current_credits,
        billing_cycle_start,
        billing_cycle_end,
        next_billing_date,
        plan:service_plans (
          credit_allocation,
          max_rollover_credits,
          billing_cycle
        )
      `)
      .eq('status', 'active')
      .lte('next_billing_date', now.toISOString())

    if (fetchError) {
      console.error('[allocate-credits] Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[allocate-credits] No subscriptions need credit allocation')
      return NextResponse.json({
        success: true,
        processedCount: 0,
        totalCreditsAllocated: 0,
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`[allocate-credits] Found ${subscriptions.length} subscriptions to process`)

    const results: AllocationResult[] = []
    const errors: Array<{ subscription_id: string; error: string }> = []
    let totalCreditsAllocated = 0

    // Process each subscription
    for (const sub of subscriptions) {
      try {
        const plan = (sub as any).plan
        if (!plan || !plan.credit_allocation) {
          console.warn(`[allocate-credits] Subscription ${sub.id} has no valid plan with credits`)
          errors.push({
            subscription_id: sub.id,
            error: 'No valid plan with credit allocation',
          })
          continue
        }

        const creditAllocation = plan.credit_allocation
        const maxRollover = plan.max_rollover_credits || 0
        const billingCycle = plan.billing_cycle || 'monthly'

        // Calculate rollover credits (capped)
        const currentCredits = sub.current_credits || 0
        const rolloverCredits = Math.min(currentCredits, maxRollover)
        const expiredCredits = Math.max(0, currentCredits - maxRollover)

        // New credit balance = rollover + new allocation
        const newCreditBalance = rolloverCredits + creditAllocation

        // Calculate next billing date based on billing cycle
        const nextBillingDate = new Date(sub.next_billing_date!)
        if (billingCycle === 'monthly') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        } else if (billingCycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
        }

        // Use the allocate_monthly_credits database function
        const { data: allocationData, error: allocationError } = await supabaseAdmin.rpc(
          'allocate_monthly_credits',
          {
            p_subscription_id: sub.id,
          }
        )

        if (allocationError) {
          console.error(
            `[allocate-credits] Error allocating credits for subscription ${sub.id}:`,
            allocationError
          )
          errors.push({
            subscription_id: sub.id,
            error: allocationError.message,
          })
          continue
        }

        const result: AllocationResult = {
          subscription_id: sub.id,
          customer_id: sub.customer_id,
          credits_before: currentCredits,
          rollover_credits: rolloverCredits,
          new_credits: creditAllocation,
          credits_after: newCreditBalance,
          expired_credits: expiredCredits,
          next_billing_date: nextBillingDate.toISOString(),
        }

        results.push(result)
        totalCreditsAllocated += creditAllocation

        console.log(
          `[allocate-credits] Processed subscription ${sub.id}: ${currentCredits} -> ${newCreditBalance} credits (${rolloverCredits} rolled over, ${creditAllocation} allocated, ${expiredCredits} expired)`
        )
      } catch (error: any) {
        console.error(`[allocate-credits] Unexpected error for subscription ${sub.id}:`, error)
        errors.push({
          subscription_id: sub.id,
          error: error.message || 'Unexpected error',
        })
      }
    }

    const response = {
      success: true,
      processedCount: results.length,
      totalCreditsAllocated,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    }

    console.log(
      `[allocate-credits] Completed: ${results.length} subscriptions processed, ${totalCreditsAllocated} total credits allocated`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[allocate-credits] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for manual testing
 * Returns preview of subscriptions that would be processed
 */
export async function GET(req: NextRequest) {
  try {
    // Check for test/debug authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json(
        {
          message: 'This is a cron endpoint. Use POST with Bearer token authentication.',
          setup: 'Set CRON_SECRET env variable and call POST with Authorization: Bearer <CRON_SECRET>',
        },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not available' },
        { status: 500 }
      )
    }

    // Preview subscriptions that need allocation
    const now = new Date()
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        id,
        customer_id,
        current_credits,
        next_billing_date,
        plan:service_plans (
          name,
          credit_allocation,
          max_rollover_credits,
          billing_cycle
        )
      `)
      .eq('status', 'active')
      .lte('next_billing_date', now.toISOString())

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: fetchError.message },
        { status: 500 }
      )
    }

    const preview = subscriptions?.map((sub) => {
      const plan = (sub as any).plan
      const currentCredits = sub.current_credits || 0
      const maxRollover = plan?.max_rollover_credits || 0
      const newAllocation = plan?.credit_allocation || 0

      const rolloverCredits = Math.min(currentCredits, maxRollover)
      const expiredCredits = Math.max(0, currentCredits - maxRollover)
      const newBalance = rolloverCredits + newAllocation

      return {
        subscription_id: sub.id,
        customer_id: sub.customer_id,
        plan_name: plan?.name,
        current_credits: currentCredits,
        rollover_credits: rolloverCredits,
        expired_credits: expiredCredits,
        new_allocation: newAllocation,
        new_balance: newBalance,
        next_billing_date: sub.next_billing_date,
      }
    })

    return NextResponse.json({
      message: 'Cron endpoint active. Use POST to allocate credits.',
      subscriptionsFound: subscriptions?.length ?? 0,
      preview: preview ?? [],
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[allocate-credits] GET error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
