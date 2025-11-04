/**
 * Workshop Job Updates API
 * Phase 4: Post status updates, photos, and messages
 *
 * POST /api/workshop/jobs/[id]/updates
 * Body: {
 *   updateType: 'status_change' | 'parts_update' | 'timeline_update' | 'customer_message' | 'internal_note',
 *   newStatus?: string,
 *   message: string,
 *   internalOnly?: boolean,
 *   photos?: string[]
 * }
 *
 * Returns: { update: RepairJobUpdate }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RepairJobUpdate } from '@/types/quotes'

interface PostJobUpdateRequest {
  updateType: 'status_change' | 'parts_update' | 'timeline_update' | 'customer_message' | 'internal_note'
  newStatus?: string
  message: string
  internalOnly?: boolean
  photos?: string[]
  metadata?: Record<string, any>
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const { id } = params
    const body: PostJobUpdateRequest = await req.json()

    const { updateType, newStatus, message, internalOnly = false, photos = [], metadata = {} } = body

    console.log(
      `[WORKSHOP-POST-UPDATE] Workshop ${authResult.data.organizationName} posting update to job ${id}`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Validate input
    if (!updateType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: updateType, message' },
        { status: 400 }
      )
    }

    // Fetch current job to verify ownership and get current status
    const { data: job, error: jobError } = await supabaseAdmin
      .from('repair_jobs')
      .select('id, workshop_id, status')
      .eq('id', id)
      .maybeSingle()

    if (jobError || !job) {
      console.error('[WORKSHOP-POST-UPDATE] Job not found:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // ✅ SECURITY: Verify workshop owns this job
    if (job.workshop_id !== authResult.data.organizationId) {
      console.warn(
        `[WORKSHOP-POST-UPDATE] Unauthorized access attempt by ${authResult.data.organizationId} to job ${id}`
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const oldStatus = job.status
    const effectiveNewStatus = updateType === 'status_change' && newStatus ? newStatus : oldStatus

    // Validate status change
    if (updateType === 'status_change' && !newStatus) {
      return NextResponse.json(
        { error: 'newStatus is required for status_change updates' },
        { status: 400 }
      )
    }

    // Create the update record
    const { data: update, error: updateError } = await supabaseAdmin
      .from('repair_job_updates')
      .insert({
        repair_job_id: id,
        created_by_user_id: authResult.data.userId,
        old_status: oldStatus,
        new_status: effectiveNewStatus,
        update_type: updateType,
        message,
        internal_only: internalOnly,
        photos,
        customer_notified: false, // Will be set true when notification is sent
        metadata,
      })
      .select()
      .single()

    if (updateError || !update) {
      console.error('[WORKSHOP-POST-UPDATE] Failed to create update:', updateError)
      return NextResponse.json({ error: 'Failed to create update' }, { status: 500 })
    }

    // If status changed, update the job status
    if (updateType === 'status_change' && newStatus && newStatus !== oldStatus) {
      const updateFields: any = { status: newStatus, updated_at: new Date().toISOString() }

      // Update relevant timestamp fields based on new status
      switch (newStatus) {
        case 'parts_received':
          updateFields.parts_received_at = new Date().toISOString()
          break
        case 'repair_started':
          updateFields.repair_started_at = new Date().toISOString()
          break
        case 'quality_check':
          updateFields.quality_check_at = new Date().toISOString()
          break
        case 'ready_for_pickup':
          updateFields.ready_for_pickup_at = new Date().toISOString()
          break
        case 'completed':
          updateFields.completed_at = new Date().toISOString()
          break
      }

      const { error: jobUpdateError } = await supabaseAdmin
        .from('repair_jobs')
        .update(updateFields)
        .eq('id', id)

      if (jobUpdateError) {
        console.error('[WORKSHOP-POST-UPDATE] Failed to update job status:', jobUpdateError)
        // Don't fail the request - the update was created successfully
      }
    }

    // Transform to typed RepairJobUpdate
    let title = 'Update'
    switch (updateType) {
      case 'status_change':
        title = `Status changed to ${effectiveNewStatus.replace(/_/g, ' ')}`
        break
      case 'parts_update':
        title = 'Parts update'
        break
      case 'timeline_update':
        title = 'Timeline updated'
        break
      case 'customer_message':
        title = 'Message to customer'
        break
      case 'internal_note':
        title = 'Internal note'
        break
    }

    const repairJobUpdate: RepairJobUpdate = {
      id: update.id,
      repairJobId: update.repair_job_id,
      updateType: update.update_type as any,
      createdBy: update.created_by_user_id,
      actorType: 'workshop',
      title,
      description: update.message,
      metadata: {
        oldStatus,
        newStatus: effectiveNewStatus,
        photos: update.photos || [],
        ...update.metadata,
      },
      visibleToCustomer: !update.internal_only,
      createdAt: update.created_at,
    }

    console.log(
      `[WORKSHOP-POST-UPDATE] Created update ${update.id} for job ${id} (type: ${updateType})`
    )

    // TODO: Send customer notification if not internal_only
    // This will be handled by the notifications system in a later task

    return NextResponse.json({ update: repairJobUpdate })
  } catch (error: any) {
    console.error('[WORKSHOP-POST-UPDATE] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
