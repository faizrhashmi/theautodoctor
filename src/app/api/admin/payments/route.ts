/**
 * Admin Payments API - Escrow Dashboard
 * Phase 4: Admin control center for escrow management
 *
 * GET /api/admin/payments?escrow_status=held|released|refunded&workshop_id=...
 *
 * Returns: { payments: RepairPayment[], count: number, totalEscrowHeld: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface RepairPayment {
  id: string
  quoteId?: string | null
  customerId: string
  workshopId?: string | null
  mechanicId?: string | null
  amount: number
  platformFee: number
  providerAmount: number
  escrowStatus: string
  heldAt: string
  releasedAt?: string | null
  refundedAt?: string | null
  stripePaymentIntentId?: string | null
  stripeTransferId?: string | null
  stripeRefundId?: string | null
  disputeReason?: string | null
  createdAt: string
  updatedAt: string

  // Joined data
  customerName?: string
  customerEmail?: string
  workshopName?: string
}

interface GetAdminPaymentsResponse {
  payments: RepairPayment[]
  count: number
  totalEscrowHeld: number
  filters?: {
    escrowStatus?: string
    workshopId?: string
  }
}

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const escrowStatusFilter = searchParams.get('escrow_status') || 'all'
    const workshopId = searchParams.get('workshop_id')

    console.log(
      `[ADMIN-PAYMENTS] Admin ${authResult.data.email} fetching payments (escrow: ${escrowStatusFilter}, workshop: ${workshopId || 'all'})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Query all payments (admin sees everything)
    let query = supabaseAdmin
      .from('repair_payments')
      .select(`
        id,
        quote_id,
        customer_id,
        workshop_id,
        mechanic_id,
        amount,
        platform_fee,
        provider_amount,
        escrow_status,
        held_at,
        released_at,
        refunded_at,
        stripe_payment_intent_id,
        stripe_transfer_id,
        stripe_refund_id,
        dispute_reason,
        created_at,
        updated_at,
        customer:customer_id (
          id,
          first_name,
          last_name,
          email
        ),
        workshop:workshop_id (
          id,
          name
        )
      `)

    // Filter by escrow status
    if (escrowStatusFilter !== 'all') {
      query = query.eq('escrow_status', escrowStatusFilter)
    }

    // Filter by workshop if specified
    if (workshopId) {
      query = query.eq('workshop_id', workshopId)
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[ADMIN-PAYMENTS] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Transform to typed RepairPayment objects
    const payments: RepairPayment[] = (data || []).map((row: any) => {
      const customer = row.customer
      const workshop = row.workshop

      return {
        id: row.id,
        quoteId: row.quote_id,
        customerId: row.customer_id,
        workshopId: row.workshop_id,
        mechanicId: row.mechanic_id,
        amount: Number(row.amount),
        platformFee: Number(row.platform_fee),
        providerAmount: Number(row.provider_amount),
        escrowStatus: row.escrow_status,
        heldAt: row.held_at,
        releasedAt: row.released_at,
        refundedAt: row.refunded_at,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        stripeTransferId: row.stripe_transfer_id,
        stripeRefundId: row.stripe_refund_id,
        disputeReason: row.dispute_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Customer info
        customerName: customer
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        customerEmail: customer?.email,

        // Workshop info
        workshopName: workshop?.name || 'Unknown Workshop',
      }
    })

    // Calculate total escrow held
    const totalEscrowHeld = payments
      .filter((p) => p.escrowStatus === 'held')
      .reduce((sum, p) => sum + p.amount, 0)

    const response: GetAdminPaymentsResponse = {
      payments,
      count: payments.length,
      totalEscrowHeld,
      filters: {
        escrowStatus: escrowStatusFilter,
        workshopId: workshopId || undefined,
      },
    }

    console.log(
      `[ADMIN-PAYMENTS] Returning ${payments.length} payments, total escrow: $${totalEscrowHeld.toFixed(2)}`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[ADMIN-PAYMENTS] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
