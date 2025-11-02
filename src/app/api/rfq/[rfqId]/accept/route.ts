/**
 * RFQ Bid Acceptance API Route
 *
 * Accepts a winning bid and converts it to a formal quote
 *
 * @route POST /api/rfq/[rfqId]/accept
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireFeature } from '@/lib/flags'
import { z } from 'zod'

/**
 * Validation schema for bid acceptance
 */
const AcceptBidSchema = z.object({
  bid_id: z.string().uuid('Invalid bid ID'),
})

export async function POST(
  request: Request,
  { params }: { params: { rfqId: string } }
) {
  try {
    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = createClient({ cookies })

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rfqId = params.rfqId

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rfqId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID format' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = AcceptBidSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const { bid_id } = validationResult.data

    // Verify RFQ ownership before accepting
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, customer_id, status, escalating_mechanic_id, title')
      .eq('id', rfqId)
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    // Authorization: Only customer can accept bids
    if (rfq.customer_id !== user.id) {
      return NextResponse.json({
        error: 'Only the customer can accept bids on their RFQ'
      }, { status: 403 })
    }

    // Check RFQ status
    if (!['open', 'under_review'].includes(rfq.status)) {
      return NextResponse.json({
        error: `Cannot accept bid on RFQ with status: ${rfq.status}`,
        current_status: rfq.status
      }, { status: 400 })
    }

    // Call database function to accept bid (atomic transaction)
    // This function handles:
    // 1. Accepting the winning bid
    // 2. Rejecting all other bids
    // 3. Updating RFQ status to 'bid_accepted'
    // 4. Updating escalation queue with winning workshop
    // 5. Calculating referral fee (5%)
    const { data: result, error: acceptError } = await supabase
      .rpc('accept_workshop_rfq_bid', {
        p_rfq_id: rfqId,
        p_bid_id: bid_id,
        p_customer_id: user.id
      })

    if (acceptError) {
      console.error('Bid acceptance error:', acceptError)
      return NextResponse.json({
        error: 'Failed to accept bid',
        details: acceptError.message
      }, { status: 500 })
    }

    // Check result from function
    if (!result || !result.success) {
      return NextResponse.json({
        error: result?.error || 'Failed to accept bid',
        details: result
      }, { status: 400 })
    }

    // Fetch the accepted bid details for response
    const { data: acceptedBid } = await supabase
      .from('workshop_rfq_bids')
      .select(`
        id,
        workshop_id,
        workshop_name,
        quote_amount,
        parts_cost,
        labor_cost,
        description,
        status
      `)
      .eq('id', bid_id)
      .single()

    // Calculate referral fee (5% of quote amount)
    const referralFeePercent = 5.0
    const referralFeeAmount = acceptedBid
      ? (acceptedBid.quote_amount * referralFeePercent) / 100
      : 0

    // Send notifications to all parties (async, don't block response)
    if (acceptedBid) {
      import('@/lib/rfq/notifications').then(({ notifyBidAccepted, notifyBidRejected }) => {
        // Notify all parties about acceptance
        notifyBidAccepted({
          customerId: rfq.customer_id,
          mechanicId: rfq.escalating_mechanic_id,
          workshopId: acceptedBid.workshop_id,
          rfqId: rfqId,
          bidId: bid_id,
          rfqTitle: rfq.title,
          workshopName: acceptedBid.workshop_name,
          bidAmount: acceptedBid.quote_amount,
          referralFee: referralFeeAmount,
        }).catch(error => console.error('Acceptance notification error:', error))

        // Notify rejected workshops
        supabase
          .from('workshop_rfq_bids')
          .select('workshop_id, workshop_name, quote_amount')
          .eq('rfq_marketplace_id', rfqId)
          .eq('status', 'rejected')
          .then(({ data: rejectedBids }) => {
            if (rejectedBids) {
              rejectedBids.forEach(rejectedBid => {
                notifyBidRejected({
                  workshopId: rejectedBid.workshop_id,
                  rfqTitle: rfq.title,
                  bidAmount: rejectedBid.quote_amount,
                }).catch(error => console.error('Rejection notification error:', error))
              })
            }
          })
      }).catch(error => console.error('Notification error:', error))
    }

    return NextResponse.json({
      success: true,
      message: 'Bid accepted successfully',
      rfq_id: rfqId,
      bid_id,
      workshop_id: result.workshop_id,
      workshop_name: acceptedBid?.workshop_name,
      quote_amount: result.quote_amount,
      referral_fee: {
        percent: referralFeePercent,
        amount: referralFeeAmount,
        mechanic_id: rfq.escalating_mechanic_id,
      },
      escalation_id: result.escalation_id,
      next_steps: {
        customer: 'The workshop will contact you to schedule the repair',
        mechanic: `You will earn a $${referralFeeAmount.toFixed(2)} referral fee (${referralFeePercent}%) when the repair is completed`,
        workshop: 'Contact the customer to schedule the repair and create a formal quote',
      },
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('Bid acceptance error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ marketplace feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
