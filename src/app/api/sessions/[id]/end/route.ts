import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { PRICING, type PlanKey } from '@/config/pricing'
import type { Database } from '@/types/supabase'
import { assertTransition, canTransition, type SessionStatus } from '@/lib/sessionFsm'
import { logInfo } from '@/lib/log'
import { sendSessionEndedEmail } from '@/lib/email/templates'

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

  // Check for customer auth (Supabase)
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  // Check for mechanic auth (custom cookie-based)
  let mechanicId: string | null = null
  const token = req.cookies.get('aad_mech')?.value
  if (token) {
    const { data: session } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    mechanicId = session?.mechanic_id || null
  }

  // Must be authenticated as either customer or mechanic
  if (!user && !mechanicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch full session details using admin client (bypasses RLS)
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, status, plan, type, started_at, mechanic_id, customer_user_id, metadata')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.error('Failed to fetch session', sessionError)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Verify authorization: must be the customer who created the session OR the assigned mechanic
  const isCustomer = user && session.customer_user_id === user.id
  const isMechanic = mechanicId && session.mechanic_id === mechanicId

  if (!isCustomer && !isMechanic) {
    console.log('[end session] Authorization failed:', {
      hasUser: !!user,
      hasMechanic: !!mechanicId,
      sessionCustomerId: session.customer_user_id,
      sessionMechanicId: session.mechanic_id,
    })
    return NextResponse.json({ error: 'Not authorized to end this session' }, { status: 403 })
  }

  // FSM VALIDATION: Check if transition to 'completed' is valid
  const currentStatus = session.status as SessionStatus

  // Idempotent: If already completed, return success
  if (currentStatus === 'completed') {
    return NextResponse.json({
      success: true,
      message: 'Session already completed',
      session: {
        id: sessionId,
        status: 'completed',
        ended_at: session.ended_at || now,
      },
    })
  }

  // Check if we can transition to completed
  if (!canTransition(currentStatus, 'completed')) {
    // Try transitioning to cancelled instead if completed is not allowed
    if (canTransition(currentStatus, 'cancelled')) {
      console.log(`[end session] Cannot transition ${currentStatus} → completed, using cancelled instead`)

      const { error: cancelError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'cancelled',
          ended_at: now,
          updated_at: now,
          metadata: {
            ...(typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {}),
            cancelled_via_end: {
              original_status: currentStatus,
              ended_at: now,
              ended_by: isCustomer ? 'customer' : 'mechanic',
            },
          },
        })
        .eq('id', sessionId)

      if (cancelError) {
        console.error('Failed to cancel session', cancelError)
        return NextResponse.json({ error: cancelError.message }, { status: 500 })
      }

      await logInfo('session.cancelled', `Session ${sessionId} cancelled (via end request)`, {
        sessionId,
        customerId: session.customer_user_id,
        mechanicId: session.mechanic_id,
        metadata: { original_status: currentStatus, ended_by: isCustomer ? 'customer' : 'mechanic' },
      })

      // Broadcast session ended event
      try {
        await supabaseAdmin.channel(`session:${sessionId}`).send({
          type: 'broadcast',
          event: 'session:ended',
          payload: {
            sessionId,
            status: 'cancelled',
            ended_at: now,
          },
        })
      } catch (broadcastError) {
        console.error('[end session] Failed to broadcast session:ended', broadcastError)
      }

      const dashboardUrl = isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'

      if (acceptHeader?.includes('application/json') || contentType?.includes('application/json')) {
        return NextResponse.json({
          success: true,
          message: 'Session cancelled successfully',
          session: { id: sessionId, status: 'cancelled', ended_at: now },
        })
      }

      return NextResponse.redirect(new URL(dashboardUrl, req.nextUrl.origin))
    }

    return NextResponse.json(
      {
        error: 'Invalid state transition',
        current: currentStatus,
        requested: 'completed',
        message: `Cannot end session in ${currentStatus} status`,
      },
      { status: 409 }
    )
  }

  console.log(`[end session] Ending session ${sessionId} with status: ${session.status}`)

  // If session was never started (pending/waiting), mark as completed with no-show metadata
  const shouldMarkNoShow = !session.started_at && ['pending', 'waiting'].includes(session.status?.toLowerCase() || '')

  const now = new Date().toISOString()
  const durationMinutes = calculateDuration(session.started_at, now)

  // If session should be marked as no-show (never started), mark as completed
  if (shouldMarkNoShow) {
    console.log(`[end session] Session ${sessionId} never started - marking as completed (no-show)`)

    // Mark session as completed (not cancelled) so it shows in mechanic history
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: now,
        updated_at: now,
        duration_minutes: 0,
        metadata: {
          ...(typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {}),
          no_show: {
            ended_at: now,
            reason: 'Session ended before starting (customer/mechanic no-show)',
            ended_by: isCustomer ? 'customer' : 'mechanic',
          },
        },
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to end no-show session', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log no-show completion
    await logInfo('session.completed', `Session ${sessionId} completed (no-show)`, {
      sessionId,
      customerId: session.customer_user_id,
      mechanicId: session.mechanic_id,
      metadata: {
        no_show: true,
        ended_by: isCustomer ? 'customer' : 'mechanic',
      },
    })

    // Broadcast session ended event
    try {
      await supabaseAdmin.channel(`session:${sessionId}`).send({
        type: 'broadcast',
        event: 'session:ended',
        payload: {
          sessionId,
          status: 'completed',
          ended_at: now,
          no_show: true,
        },
      })
    } catch (broadcastError) {
      console.error('[end session] Failed to broadcast session:ended', broadcastError)
    }

    // Mark any associated session request as cancelled (no-show)
    // CRITICAL FIX: Match by customer_id since session_requests has no session_id column
    if (session.customer_user_id) {
      await supabaseAdmin
        .from('session_requests')
        .update({
          status: 'cancelled',
          updated_at: now,
        })
        .eq('customer_id', session.customer_user_id)
        .in('status', ['pending', 'accepted', 'unattended']) // Update all active statuses
    }

    const responseData = {
      success: true,
      message: 'Session ended successfully',
      session: {
        id: sessionId,
        status: 'completed',
        ended_at: now,
      },
    }

    // Check if this is a fetch request (JSON) or form POST (redirect)
    const acceptHeader = req.headers.get('accept')
    const contentType = req.headers.get('content-type')

    if (acceptHeader?.includes('application/json') || contentType?.includes('application/json')) {
      return NextResponse.json(responseData)
    }

    // Redirect based on role
    const dashboardUrl = isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'
    return NextResponse.redirect(new URL(dashboardUrl, req.nextUrl.origin))
  }

  // Calculate mechanic earnings (only for sessions that actually happened)
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

  // Attempt Stripe transfer if mechanic has connected account AND session was actually started
  if (session.mechanic_id && mechanicEarningsCents > 0 && session.started_at) {
    try {
      // First try mechanics table (custom auth system)
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('stripe_account_id, stripe_payouts_enabled, name')
        .eq('id', session.mechanic_id)
        .single()

      // Fallback to profiles table (Supabase auth system) if not found
      const { data: profile } = !mechanic ? await supabaseAdmin
        .from('profiles')
        .select('stripe_account_id, stripe_payouts_enabled, full_name')
        .eq('id', session.mechanic_id)
        .single() : { data: null }

      const mechanicData = mechanic || profile
      const mechanicName = mechanic?.name || profile?.full_name || 'Mechanic'

      if (mechanicData?.stripe_account_id && mechanicData.stripe_payouts_enabled) {
        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: mechanicEarningsCents,
          currency: 'usd',
          destination: mechanicData.stripe_account_id,
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
          destination_account: mechanicData.stripe_account_id,
          transferred_at: now,
          mechanic_name: mechanicName,
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

  // Log session completion
  await logInfo('session.completed', `Session ${sessionId} completed`, {
    sessionId,
    customerId: session.customer_user_id,
    mechanicId: session.mechanic_id,
    metadata: {
      duration_minutes: durationMinutes,
      payout_status: payoutMetadata.status,
      ended_by: isCustomer ? 'customer' : 'mechanic',
    },
  })

  // Broadcast session ended event
  try {
    await supabaseAdmin.channel(`session:${sessionId}`).send({
      type: 'broadcast',
      event: 'session:ended',
      payload: {
        sessionId,
        status: 'completed',
        ended_at: now,
        duration_minutes: durationMinutes,
      },
    })
  } catch (broadcastError) {
    console.error('[end session] Failed to broadcast session:ended', broadcastError)
  }

  // Send session ended email to customer
  try {
    // Fetch customer and mechanic details for email
    const { data: customer } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', session.customer_user_id)
      .single()

    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('name, email')
      .eq('user_id', session.mechanic_id)
      .single()

    if (customer?.email && mechanic) {
      // Format duration for display
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      const durationStr = hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes} minutes`

      await sendSessionEndedEmail({
        customerEmail: customer.email,
        customerName: customer.full_name || 'Customer',
        mechanicName: mechanic.name || mechanic.email || 'Your Mechanic',
        sessionId,
        duration: durationStr,
        hasSummary: false, // Will be updated when summary is submitted
      })
    }
  } catch (emailError) {
    console.error('[end session] Failed to send session ended email:', emailError)
    // Don't fail the request if email fails
  }

  // CRITICAL FIX: Also mark the session_request as cancelled
  // This prevents orphaned "accepted" requests from blocking mechanics
  // Match by customer_id + mechanic_id since session_requests has no session_id column
  if (session.mechanic_id && session.customer_user_id) {
    await supabaseAdmin
      .from('session_requests')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('customer_id', session.customer_user_id)
      .eq('mechanic_id', session.mechanic_id)
      .in('status', ['pending', 'accepted', 'unattended'])

    console.log(`[end session] Updated session_request status to cancelled for customer ${session.customer_user_id}`)
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

  // Redirect based on role
  const dashboardUrl = isMechanic ? '/mechanic/dashboard' : '/customer/dashboard'
  return NextResponse.redirect(new URL(dashboardUrl, req.nextUrl.origin))
}
