/**
 * Single Draft RFQ API Route
 *
 * Fetch and update individual RFQ drafts
 *
 * @route GET /api/customer/rfq/drafts/[draftId] - Get draft details
 * @route PATCH /api/customer/rfq/drafts/[draftId] - Update draft
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'
import { z } from 'zod'

/**
 * Validation schema for draft updates
 */
const UpdateDraftSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(50).max(2000).optional(),
  issue_category: z.string().optional(),
  urgency: z.enum(['routine', 'normal', 'urgent', 'emergency']).optional(),
  budget_min: z.number().positive().optional().nullable(),
  budget_max: z.number().positive().optional().nullable(),
  customer_consent_to_share_info: z.boolean().optional(),
})

/**
 * GET: Fetch single draft details
 */
export async function GET(
  request: Request,
  { params }: { params: { draftId: string } }
) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draftId = params.draftId

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(draftId)) {
      return NextResponse.json({ error: 'Invalid draft ID format' }, { status: 400 })
    }

    // Fetch draft with full details
    const { data: draft, error: draftError } = await supabase
      .from('workshop_rfq_drafts')
      .select(`
        id,
        customer_id,
        mechanic_id,
        diagnostic_session_id,
        vehicle_id,
        title,
        description,
        issue_category,
        urgency,
        budget_min,
        budget_max,
        bid_deadline,
        max_bids,
        max_distance_km,
        min_workshop_rating,
        required_certifications,
        customer_consent_to_share_info,
        created_at,
        updated_at,
        mechanics:mechanic_id (
          id,
          full_name,
          profile_photo_url,
          rating
        ),
        vehicles:vehicle_id (
          id,
          year,
          make,
          model,
          trim,
          mileage
        ),
        metadata
      `)
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Authorization: Only customer can view their own draft
    if (draft.customer_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden - You can only view your own drafts'
      }, { status: 403 })
    }

    return NextResponse.json({
      draft,
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('Draft fetch error:', error)

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

/**
 * PATCH: Update draft
 */
export async function PATCH(
  request: Request,
  { params }: { params: { draftId: string } }
) {
  try {
    // Feature flag check
    await requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draftId = params.draftId

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(draftId)) {
      return NextResponse.json({ error: 'Invalid draft ID format' }, { status: 400 })
    }

    // Verify draft exists and customer owns it
    const { data: existingDraft, error: fetchError } = await supabase
      .from('workshop_rfq_drafts')
      .select('customer_id')
      .eq('id', draftId)
      .single()

    if (fetchError || !existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Authorization: Only customer can update their own draft
    if (existingDraft.customer_id !== user.id) {
      return NextResponse.json({
        error: 'Forbidden - You can only update your own drafts'
      }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UpdateDraftSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 })
    }

    const updates = validationResult.data

    // Update draft
    const { data: updatedDraft, error: updateError } = await supabase
      .from('workshop_rfq_drafts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single()

    if (updateError) {
      console.error('Draft update error:', updateError)
      return NextResponse.json({
        error: 'Failed to update draft',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Draft updated successfully',
      draft: updatedDraft,
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('Draft update error:', error)

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
