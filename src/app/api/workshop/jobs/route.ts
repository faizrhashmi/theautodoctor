/**
 * Workshop Jobs API - List View
 * Phase 4: Workshop's job management dashboard
 *
 * GET /api/workshop/jobs?status=all|pending|in-progress|completed
 *
 * Returns: { jobs: RepairJob[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RepairJob, GetJobsResponse } from '@/types/quotes'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'

    console.log(
      `[WORKSHOP-JOBS] Workshop ${authResult.data.organizationName} fetching jobs (status: ${statusFilter})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Build query for workshop's jobs
    let query = supabaseAdmin
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
        parts_eta,
        parts_supplier,
        additional_work_requested,
        quality_check_passed,
        final_notes,
        pickup_scheduled_at,
        picked_up_at,
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
        mechanic:mechanic_id (
          id,
          name
        )
      `)
      .eq('workshop_id', authResult.data.organizationId)

    // Apply status filters
    switch (statusFilter) {
      case 'pending':
        query = query.in('status', ['pending_parts', 'parts_received'])
        break
      case 'in-progress':
        query = query.in('status', [
          'repair_started',
          'in_progress',
          'waiting_approval',
          'quality_check',
        ])
        break
      case 'ready':
        query = query.eq('status', 'ready_for_pickup')
        break
      case 'completed':
        query = query.in('status', ['completed', 'cancelled'])
        break
      case 'all':
      default:
        // No filter - show all
        break
    }

    // Order by most urgent first
    query = query.order('estimated_completion_date', { ascending: true, nullsLast: true })

    const { data, error } = await query

    if (error) {
      console.error('[WORKSHOP-JOBS] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Transform to typed RepairJob objects
    const jobs: RepairJob[] = (data || []).map((row: any) => {
      const source = row.metadata?.source || 'direct'
      const customer = row.customer

      return {
        id: row.id,
        quoteId: source === 'direct' ? row.repair_quote_id : null,
        rfqBidId: source === 'rfq' ? row.metadata?.rfq_bid_id : null,
        source: source as 'direct' | 'rfq',
        customerId: row.customer_id,
        workshopId: row.workshop_id || '',
        vehicleId: row.vehicle_id,
        sessionId: row.metadata?.session_id || null,
        status: row.status as any,
        scheduledDate: row.metadata?.scheduled_date || null,
        startedAt: row.repair_started_at,
        completedAt: row.completed_at,
        pickedUpAt: row.picked_up_at,
        quotedPriceCents: row.metadata?.quoted_price_cents || 0,
        finalPriceCents: row.metadata?.final_price_cents || null,
        warrantyMonths: row.metadata?.warranty_months || null,
        warrantyCertificateUrl: row.metadata?.warranty_certificate_url || null,
        beforePhotos: row.metadata?.before_photos || [],
        afterPhotos: row.metadata?.after_photos || [],
        completionVideoUrl: row.metadata?.completion_video_url || null,
        changeOrders: row.metadata?.change_orders || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Job details
        jobNumber: row.job_number,
        description: row.description,
        vehicleInfo: row.vehicle_info,
        estimatedCompletionDate: row.estimated_completion_date,
        estimatedLaborHours: row.estimated_labor_hours,
        actualLaborHours: row.actual_labor_hours,
        partsStatus: row.parts_status,
        partsEta: row.parts_eta,
        additionalWorkRequested: row.additional_work_requested,
        qualityCheckPassed: row.quality_check_passed,
        finalNotes: row.final_notes,
        pickupScheduledAt: row.pickup_scheduled_at,

        // Customer info (for workshop view)
        customerName: customer
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        customerPhone: customer?.phone,
        customerEmail: customer?.email,

        // Mechanic info
        mechanicName: row.mechanic?.name,
      }
    })

    const response: GetJobsResponse = {
      jobs,
      count: jobs.length,
      filters: {
        status: statusFilter as any,
      },
    }

    console.log(
      `[WORKSHOP-JOBS] Returning ${jobs.length} jobs for workshop ${authResult.data.organizationId}`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[WORKSHOP-JOBS] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
