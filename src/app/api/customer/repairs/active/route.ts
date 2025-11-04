import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/customer/repairs/active
 * Phase 3.2: Fetch active repair jobs for the authenticated customer
 *
 * Returns all repair jobs that are not completed or cancelled
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[GET /api/customer/repairs/active] Fetching for customer ${user.id}`)

    // Fetch active repair jobs with latest update
    const { data: jobs, error: jobsError } = await supabase
      .from('repair_jobs')
      .select(`
        id,
        repair_quote_id,
        description,
        status,
        parts_status,
        parts_eta,
        estimated_completion_date,
        created_at,
        vehicle_info,
        workshop_id,
        organizations:workshop_id (
          name
        )
      `)
      .eq('customer_id', user.id)
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('[GET /api/customer/repairs/active] Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch repair jobs' }, { status: 500 })
    }

    // Fetch latest update for each job
    const jobsWithUpdates = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: latestUpdate } = await supabase
          .from('repair_job_updates')
          .select('message, created_at')
          .eq('repair_job_id', job.id)
          .eq('internal_only', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...job,
          workshop_name: job.organizations?.name || null,
          last_update: latestUpdate || null,
        }
      })
    )

    console.log(`[GET /api/customer/repairs/active] Found ${jobsWithUpdates.length} active jobs`)

    return NextResponse.json({
      jobs: jobsWithUpdates,
      count: jobsWithUpdates.length,
    })
  } catch (error) {
    console.error('[GET /api/customer/repairs/active] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
