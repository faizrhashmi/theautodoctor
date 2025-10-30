/**
 * IDEMPOTENT STRIPE WEBHOOK HANDLER
 *
 * F1: Webhook Hardening
 * - Store payment_intent_id and ignore duplicates
 * - Only set session status='live' after payment_intent.succeeded
 * - On refund/chargeback, set status='refunded' and flag for review
 *
 * Events handled:
 * 1. checkout.session.completed - Create session request
 * 2. payment_intent.succeeded - Activate session (status → 'live')
 * 3. charge.refunded - Mark session as refunded
 * 4. charge.dispute.created - Flag for review
 */

import type Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { type PlanKey, PRICING } from '@/config/pricing'
import { fulfillCheckout } from '@/lib/fulfillment'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ============================================================================
// IDEMPOTENCY: Check if event already processed
// ============================================================================

async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (error) {
    console.error('[webhook] Error checking event:', error)
    return false
  }

  return !!data
}

async function markEventProcessed(event: Stripe.Event): Promise<void> {
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    id: event.id,
    type: event.type,
    object: event.data.object as any,
    livemode: event.livemode,
    processed_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[webhook] Error marking event processed:', error)
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('[webhook:checkout] Metadata:', session.metadata)

  // Task 4: Handle session extension checkout separately
  if (session.metadata?.mode === 'extension') {
    console.log('[webhook:checkout] Extension mode detected - will be processed in payment_intent.succeeded')
    return
  }

  const plan = (session.metadata?.plan ?? '') as PlanKey

  console.log('[webhook:checkout] Plan:', plan)

  if (!plan || !PRICING[plan]) {
    throw new Error('Unknown plan in session metadata')
  }

  const result = await fulfillCheckout(plan, {
    stripeSessionId: session.id,
    intakeId: session.metadata?.intake_id ?? session.client_reference_id ?? null,
    supabaseUserId:
      typeof session.metadata?.supabase_user_id === 'string' && session.metadata?.supabase_user_id
        ? session.metadata.supabase_user_id
        : null,
    customerEmail:
      session.customer_details?.email ??
      (typeof session.metadata?.customer_email === 'string' ? session.metadata.customer_email : null),
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    slotId: typeof session.metadata?.slot_id === 'string' ? session.metadata.slot_id : null,
    workshopId: typeof session.metadata?.workshop_id === 'string' ? session.metadata.workshop_id : null,
    routingType: session.metadata?.routing_type === 'workshop_only' || session.metadata?.routing_type === 'hybrid'
      ? session.metadata.routing_type
      : 'broadcast',
  })

  console.log('[webhook:checkout] ✓ Fulfillment completed. Session ID:', result.sessionId)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('[webhook:payment] Payment succeeded:', paymentIntent.id)

  // Store payment intent
  const { error: piError } = await supabaseAdmin.from('payment_intents').upsert({
    id: paymentIntent.id,
    amount_cents: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    charge_id: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
    customer_id: paymentIntent.metadata?.customer_id || null,
    session_id: paymentIntent.metadata?.session_id || null,
    succeeded_at: new Date().toISOString(),
    metadata: paymentIntent.metadata as any,
    updated_at: new Date().toISOString(),
  })

  if (piError) {
    console.error('[webhook:payment] Error storing payment intent:', piError)
  }

  // Task 4: Handle session extension
  if (paymentIntent.metadata?.mode === 'extension') {
    const sessionId = paymentIntent.metadata?.session_id
    const extensionMinutes = parseInt(paymentIntent.metadata?.extension_minutes || '0', 10)

    if (!sessionId || !extensionMinutes) {
      console.error('[webhook:extension] Missing session_id or extension_minutes in metadata')
      return
    }

    console.log(`[webhook:extension] Processing extension: +${extensionMinutes} mins for session ${sessionId}`)

    // Idempotent upsert into session_extensions (unique on payment_intent_id)
    const { error: extError } = await supabaseAdmin
      .from('session_extensions')
      .upsert({
        session_id: sessionId,
        minutes: extensionMinutes,
        payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString(),
      })
      .onConflict('payment_intent_id')

    if (extError) {
      console.error('[webhook:extension] Error storing extension:', extError)
      // Don't return - try to update session anyway
    } else {
      console.log('[webhook:extension] ✓ Extension record created')
    }

    // Update session: add minutes to duration and expires_at
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('duration_minutes, expires_at, started_at, type')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchError || !session) {
      console.error('[webhook:extension] Session not found:', sessionId)
      return
    }

    const currentDuration = session.duration_minutes || 0
    const newDuration = currentDuration + extensionMinutes

    // Calculate new expires_at: GREATEST(now(), current expires_at) + extension
    // If expires_at is null, calculate from started_at
    let newExpiresAt: string
    if (session.expires_at) {
      const currentExpires = new Date(session.expires_at)
      const now = new Date()
      const baseTime = currentExpires > now ? currentExpires : now
      newExpiresAt = new Date(baseTime.getTime() + extensionMinutes * 60 * 1000).toISOString()
    } else if (session.started_at) {
      // Session has no expires_at but has started_at - calculate from started_at + new duration
      newExpiresAt = new Date(new Date(session.started_at).getTime() + newDuration * 60 * 1000).toISOString()
    } else {
      // Session hasn't started yet - just update duration, expires_at will be set when it starts
      newExpiresAt = session.expires_at
    }

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        duration_minutes: newDuration,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[webhook:extension] Error updating session:', updateError)
      return
    }

    console.log(`[webhook:extension] ✓ Session extended: ${currentDuration}→${newDuration} mins`)

    // Broadcast session:extended event
    // IMPORTANT: Chat uses 'session-{id}', Video uses 'session:{id}'
    try {
      const channelName = session.type === 'chat'
        ? `session-${sessionId}`
        : `session:${sessionId}`

      await supabaseAdmin.channel(channelName).send({
        type: 'broadcast',
        event: 'session:extended',
        payload: {
          sessionId,
          extensionMinutes,
          newDuration,
          newExpiresAt,
        },
      })
      console.log(`[webhook:extension] ✓ Broadcasted session:extended event to ${channelName}`)
    } catch (broadcastError) {
      console.error('[webhook:extension] Failed to broadcast session:extended:', broadcastError)
    }

    return // Extension handled, skip normal session activation logic
  }

  // CRITICAL: Only set session to 'live' after payment succeeds
  const sessionId = paymentIntent.metadata?.session_id

  if (sessionId) {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      console.warn('[webhook:payment] Session not found:', sessionId)
      return
    }

    // Only transition if currently in 'waiting' or 'scheduled' status
    if (session.status === 'waiting' || session.status === 'scheduled') {
      const { error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(session as any).metadata,
            payment_intent_id: paymentIntent.id,
            payment_confirmed_at: new Date().toISOString(),
          },
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('[webhook:payment] Error updating session:', updateError)
      } else {
        console.log('[webhook:payment] ✓ Session activated:', sessionId)
      }
    } else {
      console.log('[webhook:payment] Session already in state:', session.status, '(skipping transition to live)')
    }
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('[webhook:refund] Charge refunded:', charge.id)

  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null

  if (!paymentIntentId) {
    console.warn('[webhook:refund] No payment_intent on charge')
    return
  }

  // Get payment intent to find session
  const { data: paymentIntent } = await supabaseAdmin
    .from('payment_intents')
    .select('session_id, customer_id')
    .eq('id', paymentIntentId)
    .maybeSingle()

  if (!paymentIntent?.session_id) {
    console.warn('[webhook:refund] No session linked to payment intent')
    return
  }

  // Store refund record
  if (charge.refunds?.data?.[0]) {
    const refund = charge.refunds.data[0]

    const { error: refundError } = await supabaseAdmin.from('refunds').insert({
      id: refund.id,
      payment_intent_id: paymentIntentId,
      session_id: paymentIntent.session_id,
      amount_cents: refund.amount,
      currency: refund.currency,
      reason: (refund.reason as any) || 'requested_by_customer',
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      metadata: refund.metadata as any,
      created_at: new Date(refund.created * 1000).toISOString(),
    })

    if (refundError) {
      console.error('[webhook:refund] Error storing refund:', refundError)
    }
  }

  // Update payment intent
  const { error: piError } = await supabaseAdmin
    .from('payment_intents')
    .update({
      amount_refunded_cents: charge.amount_refunded,
      refund_status: charge.refunded ? 'full' : charge.amount_refunded > 0 ? 'partial' : 'none',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentIntentId)

  if (piError) {
    console.error('[webhook:refund] Error updating payment intent:', piError)
  }

  // Mark session as refunded (will be done by trigger in migration)
  console.log('[webhook:refund] ✓ Refund processed for session:', paymentIntent.session_id)
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log('[webhook:dispute] Dispute created:', dispute.id)

  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : null

  if (!chargeId) {
    console.warn('[webhook:dispute] No charge on dispute')
    return
  }

  // Find payment intent by charge ID
  const { data: paymentIntent } = await supabaseAdmin
    .from('payment_intents')
    .select('id, session_id')
    .eq('charge_id', chargeId)
    .maybeSingle()

  if (!paymentIntent?.session_id) {
    console.warn('[webhook:dispute] No session linked to charge')
    return
  }

  // Flag session for review
  const { error: sessionError } = await supabaseAdmin
    .from('sessions')
    .update({
      metadata: {
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_status: dispute.status,
        flagged_for_review: true,
        flagged_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentIntent.session_id)

  if (sessionError) {
    console.error('[webhook:dispute] Error flagging session:', sessionError)
  } else {
    console.log('[webhook:dispute] ✓ Session flagged for review:', paymentIntent.session_id)
  }

  // Store as a refund record with chargeback reason
  const { error: refundError } = await supabaseAdmin.from('refunds').insert({
    id: `dispute_${dispute.id}`,
    payment_intent_id: paymentIntent.id,
    session_id: paymentIntent.session_id,
    amount_cents: dispute.amount,
    currency: dispute.currency,
    reason: 'chargeback',
    status: 'pending',
    metadata: {
      dispute_id: dispute.id,
      dispute_reason: dispute.reason,
      dispute_status: dispute.status,
    } as any,
    notes: `Chargeback/Dispute: ${dispute.reason}`,
  })

  if (refundError) {
    console.error('[webhook:dispute] Error storing dispute refund:', refundError)
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 })
  }

  const rawBody = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error: any) {
    console.error('[webhook] Signature verification failed:', error.message)
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  console.log('[webhook] Event received:', event.type, event.id)

  // IDEMPOTENCY CHECK - Prevent duplicate processing
  const alreadyProcessed = await isEventProcessed(event.id)
  if (alreadyProcessed) {
    console.log('[webhook] ⚠️  Event already processed, skipping:', event.id)
    return NextResponse.json({ received: true, skipped: true, reason: 'already_processed' })
  }

  // Process event based on type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break

      default:
        console.log('[webhook] Unhandled event type:', event.type)
    }

    // Mark event as processed
    await markEventProcessed(event)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[webhook] Error processing event:', error)
    return NextResponse.json({ error: error?.message ?? 'Event processing failed' }, { status: 500 })
  }
}
