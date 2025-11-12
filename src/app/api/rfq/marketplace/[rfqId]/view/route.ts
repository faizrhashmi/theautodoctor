/**
 * RFQ View Tracking API Route
 *
 * Tracks workshop views of RFQ listings for analytics
 *
 * @route POST /api/rfq/marketplace/[rfqId]/view
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { requireFeature } from '@/lib/flags'

export async function POST(
  request: Request,
  { params }: { params: { rfqId: string } }
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

    const rfqId = params.rfqId

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rfqId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID format' }, { status: 400 })
    }

    // Parse request body to get workshop_id
    const body = await request.json()
    const { workshop_id } = body

    if (!workshop_id) {
      return NextResponse.json({ error: 'workshop_id is required' }, { status: 400 })
    }

    // Verify user is authorized to view for this workshop
    const { data: workshopRole, error: roleError } = await supabase
      .from('workshop_roles')
      .select('workshop_id, role')
      .eq('user_id', user.id)
      .eq('workshop_id', workshop_id)
      .single()

    if (roleError || !workshopRole) {
      return NextResponse.json({
        error: 'Not authorized to track views for this workshop'
      }, { status: 403 })
    }

    // Verify RFQ exists and is open
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, status')
      .eq('id', rfqId)
      .single()

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    if (rfq.status !== 'open') {
      // Still track view, but return info that RFQ is not open
      // This allows analytics even for closed RFQs
    }

    // Upsert view record (updates last_viewed_at if already exists)
    const { error: viewError } = await supabase
      .from('workshop_rfq_views')
      .upsert({
        rfq_marketplace_id: rfqId,
        workshop_id: workshop_id,
        last_viewed_at: new Date().toISOString(),
        submitted_bid: false, // Will be updated to true when bid is submitted
      }, {
        onConflict: 'rfq_marketplace_id,workshop_id',
        ignoreDuplicates: false,
      })

    if (viewError) {
      console.error('View tracking error:', viewError)
      return NextResponse.json({
        error: 'Failed to track view',
        details: viewError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'View tracked successfully',
      rfq_id: rfqId,
      workshop_id: workshop_id,
      rfq_status: rfq.status,
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('View tracking error:', error)

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
