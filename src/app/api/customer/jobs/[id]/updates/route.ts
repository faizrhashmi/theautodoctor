/**
 * Customer Job Updates API
 * Phase 4: Timeline of job updates and status changes
 *
 * GET /api/customer/jobs/[id]/updates
 *
 * Returns: { updates: RepairJobUpdate[], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RepairJobUpdate, GetJobUpdatesResponse } from '@/types/quotes'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const { id } = params

    console.log(`[JOB-UPDATES] Customer ${authResult.data.email} fetching updates for job ${id}`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // First verify customer owns this job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('repair_jobs')
      .select('id, customer_id')
      .eq('id', id)
      .maybeSingle()

    if (jobError) {
      console.error('[JOB-UPDATES] Job query error:', jobError)
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // ✅ SECURITY: Verify customer owns this job
    if (job.customer_id !== authResult.data.id) {
      console.warn(`[JOB-UPDATES] Unauthorized access attempt by ${authResult.data.id} to job ${id}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch job updates (customer-visible only)
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
      .eq('internal_only', false) // Only customer-visible updates
      .order('created_at', { ascending: false })

    if (updatesError) {
      console.error('[JOB-UPDATES] Query error:', updatesError)
      return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 })
    }

    // Transform updates to typed RepairJobUpdate
    const jobUpdates: RepairJobUpdate[] = (updates || []).map((update: any) => {
      // Determine actor type
      let actorType: 'customer' | 'workshop' | 'system' = 'system'
      if (update.created_by_user_id) {
        actorType = 'workshop' // Most updates from workshop staff
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
          title = 'Message from workshop'
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
          ...update.metadata,
        },
        visibleToCustomer: !update.internal_only,
        createdAt: update.created_at,
      }
    })

    const response: GetJobUpdatesResponse = {
      updates: jobUpdates,
      count: jobUpdates.length,
    }

    console.log(`[JOB-UPDATES] Returning ${jobUpdates.length} updates for job ${id}`)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[JOB-UPDATES] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
