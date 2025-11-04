/**
 * Repair Payment Refund API
 * Phase 1.5: Refund automation
 *
 * Initiates refund for a repair payment (quote or RFQ bid)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const RefundRequestSchema = z.object({
  reason: z.enum(['requested_by_customer', 'work_not_completed', 'customer_dissatisfied', 'other']),
  notes: z.string().optional(),
  amount: z.number().positive().optional(), // If omitted, full refund
})

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const { paymentId } = params

  try {
    const supabase = getSupabaseServer()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = RefundRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      )
    }

    const { reason, notes, amount: refundAmount } = validationResult.data

    // Fetch payment details with RLS check
    const { data: payment, error: paymentError } = await supabase
      .from('repair_payments')
      .select(
        `
        id,
        quote_id,
        customer_id,
        workshop_id,
        mechanic_id,
        amount,
        platform_fee,
        provider_amount,
        escrow_status,
        stripe_payment_intent_id,
        held_at,
        released_at,
        refunded_at
      `
      )
      .eq('id', paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      console.error('[refund] Payment not found:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Authorization: Only customer can request refund
    if (payment.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the customer can request a refund' },
        { status: 403 }
      )
    }

    // Verify payment is in escrow (not yet released or refunded)
    if (payment.escrow_status !== 'held') {
      return NextResponse.json(
        {
          error: `Cannot refund payment with escrow status: ${payment.escrow_status}`,
          current_status: payment.escrow_status,
        },
        { status: 400 }
      )
    }

    // Verify we have a Stripe payment intent ID
    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No Stripe payment intent found for this payment' },
        { status: 400 }
      )
    }

    // Calculate refund amount (default to full amount)
    const refundAmountCents = refundAmount
      ? Math.round(refundAmount * 100)
      : Math.round(payment.amount * 100)

    // Verify refund amount doesn't exceed original payment
    if (refundAmountCents > payment.amount * 100) {
      return NextResponse.json(
        { error: 'Refund amount exceeds original payment' },
        { status: 400 }
      )
    }

    // Initiate Stripe refund
    console.log(
      `[refund] Initiating refund for payment ${paymentId}, intent ${payment.stripe_payment_intent_id}, amount $${refundAmountCents / 100}`
    )

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: reason === 'other' ? 'requested_by_customer' : reason,
      metadata: {
        payment_id: paymentId,
        quote_id: payment.quote_id || '',
        customer_id: payment.customer_id,
        workshop_id: payment.workshop_id || '',
        mechanic_id: payment.mechanic_id || '',
        refund_notes: notes || '',
      },
    })

    console.log(`[refund] ✓ Stripe refund created: ${refund.id}`)

    // Update payment record (webhook will handle final status update)
    const { error: updateError } = await supabase
      .from('repair_payments')
      .update({
        escrow_status: refundAmountCents === payment.amount * 100 ? 'refunded' : 'partially_refunded',
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[refund] Error updating payment record:', updateError)
      // Don't fail the request - webhook will handle it
    }

    // Store refund record in refunds table if it exists
    // (This is idempotent with webhook handling)
    try {
      await supabase.from('refunds').insert({
        id: refund.id,
        payment_intent_id: payment.stripe_payment_intent_id,
        session_id: null, // For repair payments, no session
        amount_cents: refundAmountCents,
        currency: refund.currency,
        reason: reason,
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
        notes: notes || null,
        metadata: refund.metadata as any,
        created_at: new Date(refund.created * 1000).toISOString(),
      })
    } catch (refundInsertError) {
      console.warn('[refund] Could not insert refund record (may not exist yet):', refundInsertError)
    }

    return NextResponse.json({
      success: true,
      message: 'Refund initiated successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: reason,
      },
      payment_id: paymentId,
      escrow_status: refundAmountCents === payment.amount * 100 ? 'refunded' : 'partially_refunded',
    })
  } catch (error: any) {
    console.error('[refund] Error processing refund:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          error: 'Invalid refund request',
          details: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message ?? 'Failed to process refund' },
      { status: 500 }
    )
  }
}
