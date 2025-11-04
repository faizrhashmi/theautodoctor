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

  // Phase 1.3: Handle quote payment checkout
  if (session.metadata?.type === 'quote_payment') {
    console.log('[webhook:checkout] Quote payment detected - will be processed in payment_intent.succeeded')
    return
  }

  // Phase 1.4: Handle RFQ bid payment checkout
  if (session.metadata?.type === 'rfq_bid_payment') {
    console.log('[webhook:checkout] RFQ bid payment detected - will be processed in payment_intent.succeeded')
    return
  }

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

    // Notify mechanic of extension payment received
    try {
      const { data: fullSession } = await supabaseAdmin
        .from('sessions')
        .select('mechanic_id, customer_user_id, mechanics(user_id)')
        .eq('id', sessionId)
        .maybeSingle()

      // Extract mechanic's user_id for notifications
      const mechanicUserId = fullSession?.mechanics?.user_id || null

      // FIX: Use mechanic's user_id (not mechanic_id) for notifications
      if (mechanicUserId) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: mechanicUserId,  // Use mechanic's user_id from join
            type: 'payment_received',
            payload: {
              session_id: sessionId,
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100, // Convert cents to dollars
              currency: paymentIntent.currency,
              type: 'extension'
            }
          })
        console.log('[webhook:extension] ✓ Created payment_received notification for mechanic:', mechanicUserId)
      }
    } catch (notifError) {
      console.warn('[webhook:extension] Failed to create notification:', notifError)
    }

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

  // Phase 1.3: Handle quote payment
  if (paymentIntent.metadata?.type === 'quote_payment') {
    const quoteId = paymentIntent.metadata?.quote_id
    const customerId = paymentIntent.metadata?.customer_id
    const workshopId = paymentIntent.metadata?.workshop_id || null
    const mechanicId = paymentIntent.metadata?.mechanic_id || null
    const platformFee = parseFloat(paymentIntent.metadata?.platform_fee || '0')
    const providerAmount = parseFloat(paymentIntent.metadata?.provider_amount || '0')

    if (!quoteId || !customerId) {
      console.error('[webhook:quote-payment] Missing quote_id or customer_id in metadata')
      return
    }

    console.log(`[webhook:quote-payment] Processing payment for quote ${quoteId}`)

    // Idempotent: Check if repair_payment already exists
    const { data: existingPayment } = await supabaseAdmin
      .from('repair_payments')
      .select('id, escrow_status')
      .eq('quote_id', quoteId)
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (existingPayment) {
      console.log(`[webhook:quote-payment] Payment already processed: ${existingPayment.id}`)
      return
    }

    // Create repair_payment record with escrow
    const { error: paymentError } = await supabaseAdmin
      .from('repair_payments')
      .insert({
        quote_id: quoteId,
        customer_id: customerId,
        workshop_id: workshopId,
        mechanic_id: mechanicId,
        amount: paymentIntent.amount / 100, // Convert cents to dollars
        platform_fee: platformFee,
        provider_amount: providerAmount,
        escrow_status: 'held',
        stripe_payment_intent_id: paymentIntent.id,
        held_at: new Date().toISOString(),
      })

    if (paymentError) {
      console.error('[webhook:quote-payment] Error creating repair_payment:', paymentError)
      // Continue anyway to update quote status
    } else {
      console.log('[webhook:quote-payment] ✓ Created repair_payment with escrow')
    }

    // Update quote status to approved
    const { error: quoteError } = await supabaseAdmin
      .from('repair_quotes')
      .update({
        status: 'approved',
        customer_response: 'approved',
        customer_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (quoteError) {
      console.error('[webhook:quote-payment] Error updating quote status:', quoteError)
    } else {
      console.log('[webhook:quote-payment] ✓ Quote approved:', quoteId)
    }

    // Notify workshop/mechanic of approved quote with payment
    try {
      if (workshopId) {
        // Get workshop owner/admins
        const { data: workshopMembers } = await supabaseAdmin
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', workshopId)
          .in('role', ['owner', 'admin'])

        if (workshopMembers && workshopMembers.length > 0) {
          const notifications = workshopMembers.map((member) => ({
            user_id: member.user_id,
            type: 'quote_approved',
            payload: {
              quote_id: quoteId,
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              escrow_status: 'held',
            },
          }))

          await supabaseAdmin.from('notifications').insert(notifications)
          console.log(
            `[webhook:quote-payment] ✓ Notified ${workshopMembers.length} workshop member(s)`
          )
        }
      } else if (mechanicId) {
        // Get mechanic's user_id
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('user_id')
          .eq('id', mechanicId)
          .maybeSingle()

        if (mechanic?.user_id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: mechanic.user_id,
            type: 'quote_approved',
            payload: {
              quote_id: quoteId,
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              escrow_status: 'held',
            },
          })
          console.log('[webhook:quote-payment] ✓ Notified mechanic:', mechanic.user_id)
        }
      }
    } catch (notifError) {
      console.warn('[webhook:quote-payment] Failed to create notifications:', notifError)
    }

    return // Quote payment handled
  }

  // Phase 1.4: Handle RFQ bid payment
  if (paymentIntent.metadata?.type === 'rfq_bid_payment') {
    const rfqId = paymentIntent.metadata?.rfq_id
    const bidId = paymentIntent.metadata?.bid_id
    const customerId = paymentIntent.metadata?.customer_id
    const workshopId = paymentIntent.metadata?.workshop_id || null
    const platformFee = parseFloat(paymentIntent.metadata?.platform_fee || '0')
    const providerAmount = parseFloat(paymentIntent.metadata?.provider_amount || '0')

    if (!rfqId || !bidId || !customerId || !workshopId) {
      console.error('[webhook:rfq-bid-payment] Missing required metadata')
      return
    }

    console.log(`[webhook:rfq-bid-payment] Processing payment for RFQ ${rfqId}, bid ${bidId}`)

    // Idempotent: Check if repair_payment already exists
    const { data: existingPayment } = await supabaseAdmin
      .from('repair_payments')
      .select('id, escrow_status')
      .eq('quote_id', bidId) // Using quote_id field to store bid_id
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (existingPayment) {
      console.log(`[webhook:rfq-bid-payment] Payment already processed: ${existingPayment.id}`)
      return
    }

    // Create repair_payment record with escrow
    const { error: paymentError } = await supabaseAdmin
      .from('repair_payments')
      .insert({
        quote_id: bidId, // Using quote_id field to store bid_id
        customer_id: customerId,
        workshop_id: workshopId,
        mechanic_id: null,
        amount: paymentIntent.amount / 100, // Convert cents to dollars
        platform_fee: platformFee,
        provider_amount: providerAmount,
        escrow_status: 'held',
        stripe_payment_intent_id: paymentIntent.id,
        held_at: new Date().toISOString(),
      })

    if (paymentError) {
      console.error('[webhook:rfq-bid-payment] Error creating repair_payment:', paymentError)
      // Continue anyway to accept bid
    } else {
      console.log('[webhook:rfq-bid-payment] ✓ Created repair_payment with escrow')
    }

    // Accept the bid using the database function
    const { data: result, error: acceptError } = await supabaseAdmin.rpc('accept_workshop_rfq_bid', {
      p_rfq_id: rfqId,
      p_bid_id: bidId,
      p_customer_id: customerId,
    })

    if (acceptError) {
      console.error('[webhook:rfq-bid-payment] Error accepting bid:', acceptError)
    } else {
      console.log('[webhook:rfq-bid-payment] ✓ Bid accepted:', bidId)
    }

    // Notify workshop of accepted bid with payment
    try {
      // Get workshop owner/admins
      const { data: workshopMembers } = await supabaseAdmin
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', workshopId)
        .in('role', ['owner', 'admin'])

      if (workshopMembers && workshopMembers.length > 0) {
        const notifications = workshopMembers.map((member) => ({
          user_id: member.user_id,
          type: 'rfq_bid_accepted',
          payload: {
            rfq_id: rfqId,
            bid_id: bidId,
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            escrow_status: 'held',
          },
        }))

        await supabaseAdmin.from('notifications').insert(notifications)
        console.log(
          `[webhook:rfq-bid-payment] ✓ Notified ${workshopMembers.length} workshop member(s)`
        )
      }

      // Notify referring mechanic if there is one
      const { data: rfq } = await supabaseAdmin
        .from('workshop_rfq_marketplace')
        .select('escalating_mechanic_id')
        .eq('id', rfqId)
        .maybeSingle()

      if (rfq?.escalating_mechanic_id) {
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('user_id')
          .eq('id', rfq.escalating_mechanic_id)
          .maybeSingle()

        if (mechanic?.user_id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: mechanic.user_id,
            type: 'rfq_referral_earned',
            payload: {
              rfq_id: rfqId,
              bid_id: bidId,
              workshop_id: workshopId,
              amount: paymentIntent.amount / 100,
              referral_fee_percent: 5.0, // 5% referral fee
              referral_fee_amount: (paymentIntent.amount / 100) * 0.05,
            },
          })
          console.log('[webhook:rfq-bid-payment] ✓ Notified referring mechanic:', mechanic.user_id)
        }
      }
    } catch (notifError) {
      console.warn('[webhook:rfq-bid-payment] Failed to create notifications:', notifError)
    }

    return // RFQ bid payment handled
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

        // Notify mechanic and/or workshop of initial payment received
        try {
          const { data: fullSession } = await supabaseAdmin
            .from('sessions')
            .select('mechanic_id, customer_user_id, workshop_id, type, mechanics(user_id)')
            .eq('id', sessionId)
            .maybeSingle()

          // Extract mechanic's user_id for notifications
          const mechanicUserId = fullSession?.mechanics?.user_id || null

          // Notify mechanic if present (FIX: use user_id not mechanic_id)
          if (mechanicUserId) {
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: mechanicUserId,  // Use mechanic's user_id from join
                type: 'payment_received',
                payload: {
                  session_id: sessionId,
                  payment_intent_id: paymentIntent.id,
                  amount: paymentIntent.amount / 100, // Convert cents to dollars
                  currency: paymentIntent.currency,
                  type: 'initial'
                }
              })
            console.log('[webhook:payment] ✓ Created payment_received notification for mechanic:', mechanicUserId)
          }

          // Notify workshop owner/admins for diagnostic sessions
          if (fullSession?.workshop_id && fullSession?.type === 'diagnostic') {
            // Get workshop owner/admins from organization_members
            const { data: workshopMembers } = await supabaseAdmin
              .from('organization_members')
              .select('user_id, role')
              .eq('organization_id', fullSession.workshop_id)
              .in('role', ['owner', 'admin'])

            if (workshopMembers && workshopMembers.length > 0) {
              const workshopNotifications = workshopMembers.map(member => ({
                user_id: member.user_id,
                type: 'payment_received',
                payload: {
                  session_id: sessionId,
                  payment_intent_id: paymentIntent.id,
                  amount: paymentIntent.amount / 100,
                  currency: paymentIntent.currency,
                  type: 'diagnostic_payment',
                  workshop_id: fullSession.workshop_id
                }
              }))

              await supabaseAdmin
                .from('notifications')
                .insert(workshopNotifications)
              console.log(`[webhook:payment] ✓ Created payment_received notifications for ${workshopMembers.length} workshop member(s)`)
            }
          }
        } catch (notifError) {
          console.warn('[webhook:payment] Failed to create notification:', notifError)
        }
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

  // Phase 1.5: Check if this is a repair payment (quote or RFQ bid)
  const { data: repairPayment } = await supabaseAdmin
    .from('repair_payments')
    .select('id, quote_id, customer_id, workshop_id, mechanic_id, amount, escrow_status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (repairPayment) {
    console.log('[webhook:refund] Refund for repair payment:', repairPayment.id)

    // Store refund record
    if (charge.refunds?.data?.[0]) {
      const refund = charge.refunds.data[0]

      const { error: refundError } = await supabaseAdmin.from('refunds').insert({
        id: refund.id,
        payment_intent_id: paymentIntentId,
        session_id: null, // No session for repair payments
        amount_cents: refund.amount,
        currency: refund.currency,
        reason: (refund.reason as any) || 'requested_by_customer',
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
        metadata: refund.metadata as any,
        notes: refund.metadata?.refund_notes || null,
        created_at: new Date(refund.created * 1000).toISOString(),
      })

      if (refundError) {
        console.error('[webhook:refund] Error storing refund:', refundError)
      }
    }

    // Update repair_payment escrow status
    const isFullRefund = charge.amount_refunded === charge.amount
    const { error: paymentError } = await supabaseAdmin
      .from('repair_payments')
      .update({
        escrow_status: isFullRefund ? 'refunded' : 'partially_refunded',
        stripe_refund_id: charge.refunds?.data?.[0]?.id || null,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', repairPayment.id)

    if (paymentError) {
      console.error('[webhook:refund] Error updating repair_payment:', paymentError)
    }

    // Notify customer and provider
    try {
      // Notify customer
      await supabaseAdmin.from('notifications').insert({
        user_id: repairPayment.customer_id,
        type: 'payment_refunded',
        payload: {
          payment_id: repairPayment.id,
          quote_id: repairPayment.quote_id,
          amount: charge.amount_refunded / 100,
          currency: charge.currency,
          refund_type: isFullRefund ? 'full' : 'partial',
        },
      })

      // Notify workshop/mechanic
      if (repairPayment.workshop_id) {
        const { data: workshopMembers } = await supabaseAdmin
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', repairPayment.workshop_id)
          .in('role', ['owner', 'admin'])

        if (workshopMembers && workshopMembers.length > 0) {
          const notifications = workshopMembers.map((member) => ({
            user_id: member.user_id,
            type: 'payment_refunded',
            payload: {
              payment_id: repairPayment.id,
              quote_id: repairPayment.quote_id,
              amount: charge.amount_refunded / 100,
              currency: charge.currency,
              refund_type: isFullRefund ? 'full' : 'partial',
            },
          }))
          await supabaseAdmin.from('notifications').insert(notifications)
        }
      } else if (repairPayment.mechanic_id) {
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('user_id')
          .eq('id', repairPayment.mechanic_id)
          .maybeSingle()

        if (mechanic?.user_id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: mechanic.user_id,
            type: 'payment_refunded',
            payload: {
              payment_id: repairPayment.id,
              quote_id: repairPayment.quote_id,
              amount: charge.amount_refunded / 100,
              currency: charge.currency,
              refund_type: isFullRefund ? 'full' : 'partial',
            },
          })
        }
      }
    } catch (notifError) {
      console.warn('[webhook:refund] Failed to create notifications:', notifError)
    }

    // Audit log
    console.log(`✓ Audit: ${charge.id} | charge.refunded | repair_payment:${repairPayment.id} | customer:${repairPayment.customer_id} | $${charge.amount_refunded / 100} ${charge.currency}`)
    console.log('[webhook:refund] ✓ Refund processed for repair payment:', repairPayment.id)
    return
  }

  // Original session refund handling
  const { data: paymentIntent } = await supabaseAdmin
    .from('payment_intents')
    .select('session_id, customer_id')
    .eq('id', paymentIntentId)
    .maybeSingle()

  if (!paymentIntent?.session_id) {
    console.warn('[webhook:refund] No session or repair payment linked to payment intent')
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
  // Audit log
  console.log(`✓ Audit: ${charge.id} | charge.refunded | session:${paymentIntent.session_id} | customer:${paymentIntent.customer_id} | $${charge.amount_refunded / 100} ${charge.currency}`)
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

  // Audit log
  console.log(`⚠️  Audit: ${dispute.id} | dispute.created | charge:${chargeId} | session:${paymentIntent.session_id} | $${dispute.amount / 100} ${dispute.currency}`)
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
