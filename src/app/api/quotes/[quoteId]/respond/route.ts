import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/quotes/[quoteId]/respond
 *
 * Customer responds to a quote (approve/decline)
 *
 * Body:
 * {
 *   response: 'approved' | 'declined' | 'requested_changes',
 *   notes?: string,
 *   decline_reason?: string
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId
    const body = await req.json()

    const {
      response,
      notes = '',
      decline_reason = ''
    } = body

    // Validate response
    if (!response || !['approved', 'declined', 'requested_changes'].includes(response)) {
      return NextResponse.json(
        { error: 'Valid response is required (approved, declined, or requested_changes)' },
        { status: 400 }
      )
    }

    // Load the quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('repair_quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Check if quote can be responded to
    if (!['pending', 'viewed'].includes(quote.status)) {
      return NextResponse.json(
        { error: `Quote cannot be modified in ${quote.status} status` },
        { status: 400 }
      )
    }

    // Determine new status based on response
    const newStatus = response === 'approved' ? 'approved' :
                      response === 'declined' ? 'declined' :
                      'modified'

    // Update the quote
    const { error: updateError } = await supabaseAdmin
      .from('repair_quotes')
      .update({
        status: newStatus,
        customer_response: response,
        customer_notes: notes,
        decline_reason: response === 'declined' ? decline_reason : null,
        customer_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (updateError) {
      console.error('Error updating quote:', updateError)
      return NextResponse.json(
        { error: 'Failed to update quote' },
        { status: 500 }
      )
    }

    // If approved, create payment escrow record (optional - can be done later)
    if (response === 'approved') {
      // TODO: Create payment intent with Stripe
      // TODO: Create repair_payments record with escrow_status = 'held'
    }

    // TODO: Send notification to workshop about customer response

    return NextResponse.json({
      success: true,
      message: `Quote ${response} successfully`,
      new_status: newStatus
    })

  } catch (error: any) {
    console.error('Error responding to quote:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to respond to quote' },
      { status: 500 }
    )
  }
}
