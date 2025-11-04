/**
 * Workshop Payment Refund API
 * Phase 4: Workshop-initiated refund requests
 *
 * POST /api/workshop/payments/[paymentId]/refund
 * Body: {
 *   reason: 'work_not_completed' | 'customer_dissatisfied' | 'parts_unavailable' | 'other',
 *   notes: string (optional),
 *   amount?: number (optional - defaults to full refund)
 * }
 *
 * Returns: { success: boolean, refund: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const WorkshopRefundRequestSchema = z.object({
  reason: z.enum([
    'work_not_completed',
    'customer_dissatisfied',
    'parts_unavailable',
    'quality_issues',
    'other',
  ]),
  notes: z.string().optional(),
  amount: z.number().positive().optional(), // If omitted, full refund
})

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const { paymentId } = params

  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    console.log(
      `[WORKSHOP-REFUND] Workshop ${authResult.data.organizationName} initiating refund for payment ${paymentId}`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = WorkshopRefundRequestSchema.safeParse(body)

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

    // Fetch payment details (using supabaseAdmin to bypass RLS)
    const { data: payment, error: paymentError } = await supabaseAdmin
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
      console.error('[WORKSHOP-REFUND] Payment not found:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // ✅ SECURITY: Verify workshop owns this payment
    if (payment.workshop_id !== authResult.data.organizationId) {
      console.warn(
        `[WORKSHOP-REFUND] Unauthorized refund attempt by ${authResult.data.organizationId} for payment ${paymentId}`
      )
      return NextResponse.json(
        { error: 'Unauthorized - This payment does not belong to your workshop' },
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
      `[WORKSHOP-REFUND] Initiating refund for payment ${paymentId}, intent ${payment.stripe_payment_intent_id}, amount $${refundAmountCents / 100}`
    )

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer', // Stripe only accepts certain values
      metadata: {
        payment_id: paymentId,
        quote_id: payment.quote_id || '',
        customer_id: payment.customer_id,
        workshop_id: payment.workshop_id || '',
        mechanic_id: payment.mechanic_id || '',
        initiated_by: 'workshop',
        workshop_id_initiator: authResult.data.organizationId,
        refund_reason: reason,
        refund_notes: notes || '',
      },
    })

    console.log(`[WORKSHOP-REFUND] ✓ Stripe refund created: ${refund.id}`)

    // Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('repair_payments')
      .update({
        escrow_status: refundAmountCents === payment.amount * 100 ? 'refunded' : 'partially_refunded',
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[WORKSHOP-REFUND] Error updating payment record:', updateError)
      // Don't fail the request - webhook will handle it
    }

    // Store refund record in refunds table if it exists
    try {
      await supabaseAdmin.from('refunds').insert({
        id: refund.id,
        payment_intent_id: payment.stripe_payment_intent_id,
        session_id: null,
        amount_cents: refundAmountCents,
        currency: refund.currency,
        reason: reason,
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
        notes: notes || null,
        metadata: {
          ...refund.metadata,
          initiated_by: 'workshop',
          workshop_name: authResult.data.organizationName,
        } as any,
        created_at: new Date(refund.created * 1000).toISOString(),
      })
    } catch (refundInsertError) {
      console.warn('[WORKSHOP-REFUND] Could not insert refund record:', refundInsertError)
    }

    // TODO: Send notification to customer about refund
    // This will be handled by the notifications system in a later task

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
    console.error('[WORKSHOP-REFUND] Error processing refund:', error)

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
