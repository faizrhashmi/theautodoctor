/**
 * Admin Job Detail API
 * Phase 4: Detailed job information for admin oversight
 *
 * GET /api/admin/jobs/[id]
 *
 * Returns: { job: RepairJob, updates: RepairJobUpdate[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RepairJob, RepairJobUpdate, GetRepairJobDetailResponse } from '@/types/quotes'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { id } = params

    console.log(`[ADMIN-JOB-DETAIL] Admin ${authResult.data.email} fetching job ${id}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch job details with full joins (admin sees everything)
    const { data: job, error: jobError } = await supabaseAdmin
      .from('repair_jobs')
      .select(`
        id,
        repair_quote_id,
        customer_id,
        workshop_id,
        mechanic_id,
        vehicle_id,
        job_number,
        description,
        vehicle_info,
        status,
        quote_accepted_at,
        parts_ordered_at,
        parts_received_at,
        repair_started_at,
        quality_check_at,
        ready_for_pickup_at,
        completed_at,
        estimated_completion_date,
        estimated_labor_hours,
        actual_labor_hours,
        parts_status,
        parts_ordered_count,
        parts_received_count,
        parts_eta,
        parts_supplier,
        last_update_sent_at,
        customer_notified_ready,
        ready_notification_sent_at,
        additional_work_requested,
        additional_quote_id,
        quality_check_passed,
        quality_notes,
        final_notes,
        pickup_scheduled_at,
        pickup_reminder_sent,
        picked_up_at,
        picked_up_by_name,
        created_at,
        updated_at,
        metadata,
        customer:customer_id (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        workshop:workshop_id (
          id,
          name,
          address,
          phone,
          email
        ),
        mechanic:mechanic_id (
          id,
          name,
          phone
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error('[ADMIN-JOB-DETAIL] Query error:', jobError)
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Fetch ALL job updates (including internal ones - admin sees everything)
    const { data: updates, error: updatesError } = await supabaseAdmin
      .from('repair_job_updates')
      .select(`
        id,
        repair_job_id,
        created_by_user_id,
        old_status,
        new_status,
        update_type,
        message,
        internal_only,
        photos,
        customer_notified,
        notification_sent_at,
        created_at,
        metadata
      `)
      .eq('repair_job_id', id)
      .order('created_at', { ascending: false })

    if (updatesError) {
      console.error('[ADMIN-JOB-DETAIL] Updates query error:', updatesError)
      // Don't fail the whole request
    }

    // Transform job to typed RepairJob
    const source = job.metadata?.source || 'direct'
    const customer = job.customer
    const workshop = job.workshop

    const repairJob: RepairJob = {
      id: job.id,
      quoteId: source === 'direct' ? job.repair_quote_id : null,
      rfqBidId: source === 'rfq' ? job.metadata?.rfq_bid_id : null,
      source: source as 'direct' | 'rfq',
      customerId: job.customer_id,
      workshopId: job.workshop_id || '',
      vehicleId: job.vehicle_id,
      sessionId: job.metadata?.session_id || null,
      status: job.status as any,
      scheduledDate: job.metadata?.scheduled_date || null,
      startedAt: job.repair_started_at,
      completedAt: job.completed_at,
      pickedUpAt: job.picked_up_at,
      quotedPriceCents: job.metadata?.quoted_price_cents || 0,
      finalPriceCents: job.metadata?.final_price_cents || null,
      warrantyMonths: job.metadata?.warranty_months || null,
      warrantyCertificateUrl: job.metadata?.warranty_certificate_url || null,
      beforePhotos: job.metadata?.before_photos || [],
      afterPhotos: job.metadata?.after_photos || [],
      completionVideoUrl: job.metadata?.completion_video_url || null,
      changeOrders: job.metadata?.change_orders || [],
      createdAt: job.created_at,
      updatedAt: job.updated_at,

      // Job details
      jobNumber: job.job_number,
      description: job.description,
      vehicleInfo: job.vehicle_info,
      estimatedCompletionDate: job.estimated_completion_date,
      estimatedLaborHours: job.estimated_labor_hours,
      actualLaborHours: job.actual_labor_hours,
      partsStatus: job.parts_status,
      partsEta: job.parts_eta,
      additionalWorkRequested: job.additional_work_requested,
      qualityCheckPassed: job.quality_check_passed,
      finalNotes: job.final_notes,
      pickupScheduledAt: job.pickup_scheduled_at,

      // Customer info
      customerName: customer
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown'
        : 'Unknown',
      customerPhone: customer?.phone,
      customerEmail: customer?.email,

      // Workshop info
      workshopName: workshop?.name || 'Unknown Workshop',
      workshopAddress: workshop?.address,
      workshopPhone: workshop?.phone,

      // Mechanic info
      mechanicName: job.mechanic?.name,
    }

    // Transform updates to typed RepairJobUpdate
    const jobUpdates: RepairJobUpdate[] = (updates || []).map((update: any) => {
      // Determine actor type
      let actorType: 'customer' | 'workshop' | 'system' = 'system'
      if (update.created_by_user_id) {
        actorType = 'workshop'
      }

      // Generate title from update type
      let title = 'Update'
      switch (update.update_type) {
        case 'status_change':
          title = `Status changed to ${update.new_status.replace(/_/g, ' ')}`
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
        default:
          title = update.update_type.replace(/_/g, ' ')
      }

      return {
        id: update.id,
        repairJobId: update.repair_job_id,
        updateType: update.update_type as any,
        createdBy: update.created_by_user_id,
        actorType,
        title,
        description: update.message,
        metadata: {
          oldStatus: update.old_status,
          newStatus: update.new_status,
          photos: update.photos || [],
          customerNotified: update.customer_notified,
          notificationSentAt: update.notification_sent_at,
          internalOnly: update.internal_only,
          ...update.metadata,
        },
        visibleToCustomer: !update.internal_only,
        createdAt: update.created_at,
      }
    })

    const response: GetRepairJobDetailResponse = {
      job: repairJob,
      updates: jobUpdates,
    }

    console.log(`[ADMIN-JOB-DETAIL] Returning job ${id} with ${jobUpdates.length} updates`)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[ADMIN-JOB-DETAIL] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
