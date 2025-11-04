/**
 * Admin Jobs API - All Jobs Across All Workshops
 * Phase 4: Admin control center - view all repair jobs on the platform
 *
 * GET /api/admin/jobs?status=all|pending|in-progress|completed&workshop_id=...
 *
 * Returns: { jobs: RepairJob[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RepairJob, GetJobsResponse } from '@/types/quotes'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'
    const workshopId = searchParams.get('workshop_id')

    console.log(
      `[ADMIN-JOBS] Admin ${authResult.data.email} fetching jobs (status: ${statusFilter}, workshop: ${workshopId || 'all'})`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Build query (admin sees ALL jobs, no workshop_id filter unless specified)
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
        workshop:workshop_id (
          id,
          name,
          address,
          phone
        ),
        mechanic:mechanic_id (
          id,
          name
        )
      `)

    // Filter by workshop if specified
    if (workshopId) {
      query = query.eq('workshop_id', workshopId)
    }

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
          'ready_for_pickup',
        ])
        break
      case 'completed':
        query = query.in('status', ['completed', 'cancelled'])
        break
      case 'all':
      default:
        // No filter - show all
        break
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[ADMIN-JOBS] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Transform to typed RepairJob objects
    const jobs: RepairJob[] = (data || []).map((row: any) => {
      const source = row.metadata?.source || 'direct'
      const customer = row.customer
      const workshop = row.workshop

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
      `[ADMIN-JOBS] Returning ${jobs.length} jobs (status: ${statusFilter}, workshop: ${workshopId || 'all'})`
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[ADMIN-JOBS] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
