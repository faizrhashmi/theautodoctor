import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { PRICING, type PlanKey } from '@/config/pricing'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const MECHANIC_SHARE = 0.7 // 70% to mechanic, 30% to platform

/**
 * Calculate duration in minutes between two ISO timestamps
 */
function calculateDuration(startedAt: string | null, endedAt: string): number | null {
  if (!startedAt) return null

  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null
  }

  return Math.max(1, Math.round((end - start) / 60000))
}

/**
 * POST /api/sessions/:id/end
 * Ends a session and processes mechanic payout
 *
 * Flow:
 * 1. Verify user is authorized (participant)
 * 2. Fetch session details (plan, mechanic, started_at)
 * 3. Calculate duration
 * 4. Calculate mechanic earnings (70%)
 * 5. Create Stripe transfer if mechanic has connected account
 * 6. Update session with completion data and payout metadata
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the user is a participant in this session
  const { data: participant } = await supabaseClient
    .from('session_participants')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!participant) {
    return NextResponse.json({ error: 'Not authorized to end this session' }, { status: 403 })
  }

  // Fetch full session details using admin client (bypasses RLS)
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, status, plan, type, started_at, mechanic_id, metadata')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('Failed to fetch session', sessionError)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Don't allow ending already completed sessions
  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const durationMinutes = calculateDuration(session.started_at, now)

  // Calculate mechanic earnings
  const planKey = session.plan as PlanKey
  const planPrice = PRICING[planKey]?.priceCents || 0
  const mechanicEarningsCents = Math.round(planPrice * MECHANIC_SHARE)

  let payoutMetadata: any = {
    amount_cents: mechanicEarningsCents,
    amount_dollars: (mechanicEarningsCents / 100).toFixed(2),
    plan: session.plan,
    plan_price_cents: planPrice,
    mechanic_share_percent: MECHANIC_SHARE * 100,
    calculated_at: now,
  }

  // Attempt Stripe transfer if mechanic has connected account
  if (session.mechanic_id && mechanicEarningsCents > 0) {
    try {
      const { data: mechanicProfile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_account_id, stripe_payouts_enabled, full_name')
        .eq('id', session.mechanic_id)
        .single()

      if (mechanicProfile?.stripe_account_id && mechanicProfile.stripe_payouts_enabled) {
        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: mechanicEarningsCents,
          currency: 'usd',
          destination: mechanicProfile.stripe_account_id,
          description: `Session ${sessionId} - ${session.type} (${session.plan})`,
          metadata: {
            session_id: sessionId,
            mechanic_id: session.mechanic_id,
            plan: session.plan,
            session_type: session.type,
          },
        })

        payoutMetadata = {
          ...payoutMetadata,
          status: 'transferred',
          transfer_id: transfer.id,
          destination_account: mechanicProfile.stripe_account_id,
          transferred_at: now,
          mechanic_name: mechanicProfile.full_name || 'Mechanic',
        }

        console.log(`✅ Stripe transfer created: ${transfer.id} for ${mechanicEarningsCents / 100} USD`)
      } else {
        payoutMetadata = {
          ...payoutMetadata,
          status: 'pending_stripe_connection',
          message: 'Mechanic needs to complete Stripe Connect onboarding',
        }

        console.warn(`⚠️ Mechanic ${session.mechanic_id} not connected to Stripe - payout pending`)
      }
    } catch (stripeError) {
      console.error('Stripe transfer failed', stripeError)
      payoutMetadata = {
        ...payoutMetadata,
        status: 'transfer_failed',
        error: stripeError instanceof Error ? stripeError.message : 'Transfer failed',
        failed_at: now,
      }
    }
  } else {
    payoutMetadata = {
      ...payoutMetadata,
      status: 'no_payout',
      message: 'No mechanic assigned or zero earnings',
    }
  }

  // Update session with completion data
  const existingMetadata = (session.metadata || {}) as Record<string, any>
  const { error: updateError } = await supabaseAdmin
    .from('sessions')
    .update({
      status: 'completed',
      ended_at: now,
      duration_minutes: durationMinutes,
      updated_at: now,
      metadata: {
        ...existingMetadata,
        payout: payoutMetadata,
      },
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('Failed to update session', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Check if this is a fetch request (JSON) or form POST (redirect)
  const contentType = req.headers.get('content-type')
  const acceptHeader = req.headers.get('accept')

  const responseData = {
    success: true,
    message: 'Session ended successfully',
    session: {
      id: sessionId,
      status: 'completed',
      ended_at: now,
      duration_minutes: durationMinutes,
    },
    payout: payoutMetadata,
  }

  // If the request accepts JSON or has no specific accept header, return JSON
  // Otherwise redirect (for form submissions)
  if (acceptHeader?.includes('application/json') || contentType?.includes('application/json')) {
    return NextResponse.json(responseData)
  }

  // Redirect back to dashboard for form submissions
  return NextResponse.redirect(new URL('/customer/dashboard', req.nextUrl.origin))
}
