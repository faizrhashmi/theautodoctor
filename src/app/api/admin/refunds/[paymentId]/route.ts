/**
 * Admin Refund Initiation API
 * Phase 4: Admin-initiated refunds (dispute resolution, manual intervention)
 *
 * POST /api/admin/refunds/[paymentId]
 * Body: {
 *   reason: string,
 *   notes?: string,
 *   amount?: number (optional - defaults to full refund)
 * }
 *
 * Returns: { success: boolean, refund: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const AdminRefundRequestSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  amount: z.number().positive().optional(), // If omitted, full refund
})

export async function POST(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const { paymentId } = params

  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    console.log(
      `[ADMIN-REFUND] Admin ${authResult.data.email} initiating refund for payment ${paymentId}`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = AdminRefundRequestSchema.safeParse(body)

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

    // Fetch payment details
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
      console.error('[ADMIN-REFUND] Payment not found:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment can be refunded (not already fully refunded)
    if (payment.escrow_status === 'refunded') {
      return NextResponse.json(
        {
          error: 'Payment has already been fully refunded',
          current_status: payment.escrow_status,
        },
        { status: 400 }
      )
    }

    // Allow refunds for 'held' or 'released' payments
    if (!['held', 'released', 'partially_refunded'].includes(payment.escrow_status)) {
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
      `[ADMIN-REFUND] Initiating refund for payment ${paymentId}, intent ${payment.stripe_payment_intent_id}, amount $${refundAmountCents / 100}`
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
        initiated_by: 'admin',
        admin_id: authResult.data.id,
        admin_email: authResult.data.email,
        refund_reason: reason,
        refund_notes: notes || '',
      },
    })

    console.log(`[ADMIN-REFUND] ✓ Stripe refund created: ${refund.id}`)

    // Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('repair_payments')
      .update({
        escrow_status: refundAmountCents === payment.amount * 100 ? 'refunded' : 'partially_refunded',
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dispute_reason: reason, // Store admin reason in dispute_reason field
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[ADMIN-REFUND] Error updating payment record:', updateError)
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
          initiated_by: 'admin',
          admin_email: authResult.data.email,
        } as any,
        created_at: new Date(refund.created * 1000).toISOString(),
      })
    } catch (refundInsertError) {
      console.warn('[ADMIN-REFUND] Could not insert refund record:', refundInsertError)
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: authResult.data.id,
        action_type: 'refund_initiation',
        target_type: 'repair_payment',
        target_id: paymentId,
        old_value: payment.escrow_status,
        new_value: refundAmountCents === payment.amount * 100 ? 'refunded' : 'partially_refunded',
        notes: notes || null,
        metadata: {
          payment_id: paymentId,
          quote_id: payment.quote_id,
          workshop_id: payment.workshop_id,
          refund_id: refund.id,
          refund_amount: refundAmount || payment.amount,
          refund_reason: reason,
        },
      })
    } catch (logError) {
      console.warn('[ADMIN-REFUND] Could not log admin action:', logError)
    }

    // TODO: Send notification to customer about refund
    // This will be handled by the notifications system in a later task

    return NextResponse.json({
      success: true,
      message: 'Refund initiated successfully by admin',
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
    console.error('[ADMIN-REFUND] Error processing refund:', error)

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
