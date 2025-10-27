/**
 * F2: SATISFACTION CLAIMS - Approve and trigger refund
 *
 * POST /api/admin/claims/[id]/approve
 *
 * Approves a satisfaction claim and triggers a Stripe refund.
 * Marks session as 'refunded' and links refund to claim.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(req)
  if (!auth.authorized) {
    return auth.response!
  }

  const claimId = params.id

  console.warn(
    `[SECURITY] CRITICAL: Admin ${auth.profile?.full_name} approving refund for claim ${claimId}`
  )

  try {
    const body = await req.json()
    const { resolution, refundAmount } = body as {
      resolution?: string
      refundAmount?: number // Optional: if not provided, refund full amount
    }

    // 1. FETCH CLAIM
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('satisfaction_claims')
      .select('*, sessions!inner(id, plan, customer_user_id)')
      .eq('id', claimId)
      .eq('status', 'open')
      .maybeSingle()

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found or already processed' }, { status: 404 })
    }

    const session = (claim as any).sessions

    // 2. FIND PAYMENT INTENT
    const { data: paymentIntent, error: piError } = await supabaseAdmin
      .from('payment_intents')
      .select('*')
      .eq('session_id', claim.session_id)
      .eq('status', 'succeeded')
      .maybeSingle()

    if (piError || !paymentIntent) {
      return NextResponse.json(
        { error: 'No successful payment found for this session' },
        { status: 400 }
      )
    }

    // Check if already refunded
    if (paymentIntent.refund_status === 'full') {
      return NextResponse.json(
        { error: 'Payment has already been fully refunded' },
        { status: 400 }
      )
    }

    // 3. CREATE STRIPE REFUND
    const amountToRefund = refundAmount || paymentIntent.amount_cents - paymentIntent.amount_refunded_cents

    console.log('[claim:approve] Creating Stripe refund:', {
      paymentIntentId: paymentIntent.id,
      amount: amountToRefund,
      claimId,
    })

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: amountToRefund,
      reason: 'requested_by_customer',
      metadata: {
        satisfaction_claim_id: claimId,
        session_id: claim.session_id,
        approved_by: auth.user!.id,
        approved_by_name: auth.profile?.full_name || auth.profile?.email,
      },
    })

    console.log('[claim:approve] Stripe refund created:', refund.id)

    // 4. STORE REFUND IN DATABASE
    const { error: refundError } = await supabaseAdmin.from('refunds').insert({
      id: refund.id,
      payment_intent_id: paymentIntent.id,
      session_id: claim.session_id,
      amount_cents: refund.amount,
      currency: refund.currency,
      reason: 'satisfaction_claim',
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      satisfaction_claim_id: claimId,
      metadata: refund.metadata as any,
      notes: resolution || `Approved satisfaction claim ${claimId}`,
      created_at: new Date(refund.created * 1000).toISOString(),
    })

    if (refundError) {
      console.error('[claim:approve] Error storing refund:', refundError)
    }

    // 5. UPDATE CLAIM STATUS
    const { error: updateError } = await supabaseAdmin
      .from('satisfaction_claims')
      .update({
        status: 'approved',
        resolution: resolution || `Refund approved: ${refund.id}`,
        refund_id: refund.id,
        refund_amount_cents: refund.amount,
        reviewed_at: new Date().toISOString(),
        // TODO: Add reviewed_by_admin_id if you have admin auth
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)

    if (updateError) {
      console.error('[claim:approve] Error updating claim:', updateError)
      return NextResponse.json({ error: 'Failed to update claim status' }, { status: 500 })
    }

    // 6. UPDATE SESSION STATUS (will be done by trigger, but we can do it explicitly too)
    const { error: sessionError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata || {}),
          refund_id: refund.id,
          refund_amount_cents: refund.amount,
          refund_reason: 'satisfaction_claim',
          claim_id: claimId,
          refunded_at: new Date().toISOString(),
        },
      })
      .eq('id', claim.session_id)

    if (sessionError) {
      console.error('[claim:approve] Error updating session:', sessionError)
    }

    console.log('[claim:approve] ✓ Claim approved successfully:', claimId)

    return NextResponse.json({
      success: true,
      claim: {
        id: claimId,
        status: 'approved',
        refund_id: refund.id,
        refund_amount_cents: refund.amount,
      },
      refund: {
        id: refund.id,
        amount_cents: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
      session: {
        id: claim.session_id,
        status: 'refunded',
      },
    })
  } catch (error: any) {
    console.error('[claim:approve] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to approve claim',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
