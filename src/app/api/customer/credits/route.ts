import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/credits
 * Returns customer's credit balance and transaction history
 *
 * Query params:
 * - limit: number of transactions to return (default 20)
 * - offset: pagination offset
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get current subscription and balance
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('id, current_credits, total_credits_allocated, credits_used, plan:service_plans(name)')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('[GET /api/customer/credits] Subscription error:', subError)
    }

    // Get transaction history
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (txError) {
      console.error('[GET /api/customer/credits] Transaction error:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id)

    return NextResponse.json({
      balance: subscription?.current_credits || 0,
      lifetime_allocated: subscription?.total_credits_allocated || 0,
      lifetime_used: subscription?.credits_used || 0,
      plan_name: subscription?.plan?.name || null,
      transactions: transactions || [],
      total_transactions: count || 0,
      has_subscription: !!subscription
    })
  } catch (error) {
    console.error('[GET /api/customer/credits] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
