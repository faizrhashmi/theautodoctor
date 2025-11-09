/**
 * Customer Approve Draft RFQ API
 *
 * POST: Customer reviews and approves draft RFQ created by mechanic
 * This publishes the RFQ to the marketplace
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { z } from 'zod'

const ApproveSchema = z.object({
  customer_consent: z.literal(true),
  // Allow customer to modify before approval
  title: z.string().min(10).max(100).optional(),
  description: z.string().min(50).max(1000).optional(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = ApproveSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const data = validationResult.data
    const { draftId } = params

    // Fetch draft RFQ
    const { data: draft, error: draftError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('*')
      .eq('id', draftId)
      .eq('customer_id', user.id)
      .eq('rfq_status', 'draft')
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft RFQ not found' }, { status: 404 })
    }

    // Prepare updates (allow customer to modify)
    const updates: any = {
      rfq_status: 'active',
      status: 'open',
      customer_consent_to_share_info: true,
      customer_consent_timestamp: new Date().toISOString(),
      metadata: {
        ...draft.metadata,
        customer_approved_at: new Date().toISOString(),
        customer_modified: !!(data.title || data.description || data.budget_min || data.budget_max)
      }
    }

    // Apply customer modifications if provided
    if (data.title) updates.title = data.title
    if (data.description) updates.description = data.description
    if (data.budget_min !== undefined) updates.budget_min = data.budget_min
    if (data.budget_max !== undefined) updates.budget_max = data.budget_max

    // Update RFQ to active status
    const { data: approvedRfq, error: updateError } = await supabase
      .from('workshop_rfq_marketplace')
      .update(updates)
      .eq('id', draftId)
      .select()
      .single()

    if (updateError) {
      console.error('[Approve Draft] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to approve draft' }, { status: 500 })
    }

    // Update escalation queue
    await supabase
      .from('workshop_escalation_queue')
      .update({
        escalation_status: 'posted',
        status: 'posted',
        rfq_posted_at: new Date().toISOString()
      })
      .eq('id', draft.escalation_queue_id)

    // Send notification to mechanic about approval
    if (draft.escalating_mechanic_id) {
      try {
        const { data: mechanic } = await supabase
          .from('mechanics')
          .select('user_id')
          .eq('id', draft.escalating_mechanic_id)
          .single()

        if (mechanic) {
          await supabase
            .from('notifications')
            .insert({
              user_id: mechanic.user_id,
              type: 'rfq_draft_approved',
              payload: {
                rfq_id: draft.id,
                title: approvedRfq.title,
                message: 'Customer approved your RFQ draft and it\'s now live in the marketplace!'
              }
            })
        }
      } catch (notifError) {
        console.warn('[Approve Draft] Failed to send mechanic notification:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      rfq_id: approvedRfq.id,
      status: 'active',
      message: 'RFQ approved and published to marketplace'
    })

  } catch (error) {
    console.error('[Approve Draft] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
