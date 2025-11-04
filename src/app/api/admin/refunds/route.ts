/**
 * Admin Refunds API - Refund Management Dashboard
 * Phase 4: Admin control center for refund oversight
 *
 * GET /api/admin/refunds?status=all|pending|succeeded|failed
 *
 * Returns: { refunds: Refund[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface Refund {
  id: string
  paymentIntentId: string
  sessionId?: string | null
  amountCents: number
  currency: string
  reason: string
  status: string
  notes?: string | null
  createdAt: string
  metadata?: any

  // Joined payment info
  customerId?: string
  customerName?: string
  workshopId?: string
  workshopName?: string
}

interface GetAdminRefundsResponse {
  refunds: Refund[]
  count: number
  totalRefunded: number
  filters?: {
    status?: string
  }
}

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'

    console.log(
      `[ADMIN-REFUNDS] Admin ${authResult.data.email} fetching refunds (status: ${statusFilter})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Check if refunds table exists
    let query = supabaseAdmin
      .from('refunds')
      .select(`
        id,
        payment_intent_id,
        session_id,
        amount_cents,
        currency,
        reason,
        status,
        notes,
        created_at,
        metadata
      `)

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      // If refunds table doesn't exist, fall back to repair_payments table
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[ADMIN-REFUNDS] Refunds table does not exist, falling back to repair_payments')

        const { data: payments, error: paymentsError } = await supabaseAdmin
          .from('repair_payments')
          .select(`
            id,
            stripe_payment_intent_id,
            stripe_refund_id,
            amount,
            escrow_status,
            refunded_at,
            customer_id,
            workshop_id,
            dispute_reason,
            customer:customer_id (
              first_name,
              last_name
            ),
            workshop:workshop_id (
              name
            )
          `)
          .in('escrow_status', ['refunded', 'partially_refunded'])
          .order('refunded_at', { ascending: false })

        if (paymentsError) {
          console.error('[ADMIN-REFUNDS] Fallback query error:', paymentsError)
          return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 })
        }

        // Transform repair_payments to Refund format
        const refunds: Refund[] = (payments || []).map((row: any) => {
          const customer = row.customer
          return {
            id: row.stripe_refund_id || row.id,
            paymentIntentId: row.stripe_payment_intent_id || '',
            sessionId: null,
            amountCents: Math.round(Number(row.amount) * 100),
            currency: 'usd',
            reason: row.dispute_reason || 'unknown',
            status: row.escrow_status === 'refunded' ? 'succeeded' : 'partial',
            notes: null,
            createdAt: row.refunded_at || row.created_at,
            metadata: {
              payment_id: row.id,
              source: 'repair_payment',
            },
            customerId: row.customer_id,
            customerName: customer
              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            workshopId: row.workshop_id,
            workshopName: row.workshop?.name || 'Unknown Workshop',
          }
        })

        const totalRefunded = refunds.reduce((sum, r) => sum + r.amountCents, 0) / 100

        return NextResponse.json({
          refunds,
          count: refunds.length,
          totalRefunded,
          filters: { status: statusFilter },
        })
      }

      console.error('[ADMIN-REFUNDS] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 })
    }

    // Transform to typed Refund objects
    const refunds: Refund[] = (data || []).map((row: any) => ({
      id: row.id,
      paymentIntentId: row.payment_intent_id,
      sessionId: row.session_id,
      amountCents: row.amount_cents,
      currency: row.currency,
      reason: row.reason,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      metadata: row.metadata,
      // Additional fields from metadata if available
      customerId: row.metadata?.customer_id,
      customerName: row.metadata?.customer_name,
      workshopId: row.metadata?.workshop_id,
      workshopName: row.metadata?.workshop_name,
    }))

    // Calculate total refunded
    const totalRefunded = refunds
      .filter((r) => r.status === 'succeeded')
      .reduce((sum, r) => sum + r.amountCents, 0) / 100

    const response: GetAdminRefundsResponse = {
      refunds,
      count: refunds.length,
      totalRefunded,
      filters: {
        status: statusFilter,
      },
    }

    console.log(
      `[ADMIN-REFUNDS] Returning ${refunds.length} refunds, total: $${totalRefunded.toFixed(2)}`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[ADMIN-REFUNDS] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
