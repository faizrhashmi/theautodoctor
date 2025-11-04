/**
 * Admin Escrow Release API
 * Phase 4: Release escrow funds to workshop after job completion
 *
 * POST /api/admin/payments/[paymentId]/release
 * Body: {
 *   notes?: string
 * }
 *
 * Returns: { success: boolean, transfer: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

interface ReleaseEscrowRequest {
  notes?: string
}

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
      `[ADMIN-ESCROW-RELEASE] Admin ${authResult.data.email} releasing escrow for payment ${paymentId}`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body: ReleaseEscrowRequest = await req.json().catch(() => ({}))
    const { notes } = body

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
        stripe_transfer_id,
        held_at,
        released_at,
        refunded_at
      `
      )
      .eq('id', paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      console.error('[ADMIN-ESCROW-RELEASE] Payment not found:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment is in escrow (held, not released or refunded)
    if (payment.escrow_status !== 'held') {
      return NextResponse.json(
        {
          error: `Cannot release payment with escrow status: ${payment.escrow_status}`,
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

    // Check if transfer already exists (in case of retry)
    if (payment.stripe_transfer_id) {
      console.warn(
        '[ADMIN-ESCROW-RELEASE] Transfer already exists:',
        payment.stripe_transfer_id
      )
      return NextResponse.json(
        {
          error: 'Transfer has already been created for this payment',
          transfer_id: payment.stripe_transfer_id,
        },
        { status: 400 }
      )
    }

    // TODO: In production, you would:
    // 1. Get workshop's Stripe Connect account ID
    // 2. Create a Stripe Transfer to that connected account
    // 3. Deduct platform fee from provider_amount
    //
    // For now, we'll simulate the transfer and update the status

    console.log(
      `[ADMIN-ESCROW-RELEASE] Simulating transfer of $${payment.provider_amount} to workshop ${payment.workshop_id}`
    )

    // In a real implementation:
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(payment.provider_amount * 100),
    //   currency: 'usd',
    //   destination: workshopStripeAccountId,
    //   transfer_group: payment.quote_id || paymentId,
    //   metadata: {
    //     payment_id: paymentId,
    //     quote_id: payment.quote_id || '',
    //     workshop_id: payment.workshop_id || '',
    //     released_by_admin: authResult.data.id,
    //     release_notes: notes || '',
    //   },
    // })

    // For now, we'll use a simulated transfer ID
    const simulatedTransferId = `tr_simulated_${Date.now()}`

    // Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('repair_payments')
      .update({
        escrow_status: 'released',
        stripe_transfer_id: simulatedTransferId,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('[ADMIN-ESCROW-RELEASE] Error updating payment record:', updateError)
      return NextResponse.json(
        { error: 'Failed to update payment record' },
        { status: 500 }
      )
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_actions').insert({
        admin_id: authResult.data.id,
        action_type: 'escrow_release',
        target_type: 'repair_payment',
        target_id: paymentId,
        old_value: 'held',
        new_value: 'released',
        notes: notes || null,
        metadata: {
          payment_id: paymentId,
          quote_id: payment.quote_id,
          workshop_id: payment.workshop_id,
          amount: payment.amount,
          provider_amount: payment.provider_amount,
          platform_fee: payment.platform_fee,
          transfer_id: simulatedTransferId,
        },
      })
    } catch (logError) {
      console.warn('[ADMIN-ESCROW-RELEASE] Could not log admin action:', logError)
    }

    // TODO: Send notification to workshop about funds release
    // This will be handled by the notifications system in a later task

    return NextResponse.json({
      success: true,
      message: 'Escrow released successfully',
      transfer: {
        id: simulatedTransferId,
        amount: payment.provider_amount,
        currency: 'usd',
        status: 'simulated', // In production: 'pending' | 'paid' | 'failed'
        destination: payment.workshop_id,
      },
      payment_id: paymentId,
      escrow_status: 'released',
      released_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[ADMIN-ESCROW-RELEASE] Error releasing escrow:', error)

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          error: 'Invalid transfer request',
          details: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message ?? 'Failed to release escrow' },
      { status: 500 }
    )
  }
}
