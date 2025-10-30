import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * POST /api/mechanics/jobs
 *
 * Record a completed job and calculate revenue split
 *
 * Body:
 * {
 *   agreement_id: string
 *   bay_booking_id?: string
 *   customer_name: string
 *   vehicle_info: string
 *   job_description: string
 *   parts_cost: number
 *   labor_cost: number
 *   total_revenue: number
 *   completed_at?: string (ISO date, defaults to now)
 * }
 */
export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Parse request body
    const body = await req.json()
    const {
      agreement_id,
      bay_booking_id,
      customer_name,
      vehicle_info,
      job_description,
      parts_cost,
      labor_cost,
      total_revenue,
      completed_at
    } = body

    // Validation
    if (!agreement_id || !customer_name || !vehicle_info || !job_description || total_revenue === undefined) {
      return NextResponse.json({
        error: 'agreement_id, customer_name, vehicle_info, job_description, and total_revenue are required'
      }, { status: 400 })
    }

    if (total_revenue < 0) {
      return NextResponse.json({
        error: 'total_revenue must be positive'
      }, { status: 400 })
    }

    // Get partnership agreement with program details
    const { data: agreement, error: agreementError } = await supabaseAdmin
      .from('partnership_agreements')
      .select(`
        *,
        workshop_partnership_programs!partnership_agreements_program_id_fkey (
          id,
          program_name,
          program_type,
          mechanic_percentage,
          workshop_percentage,
          daily_rate,
          hourly_rate
        )
      `)
      .eq('id', agreement_id)
      .single()

    if (agreementError || !agreement) {
      return NextResponse.json({ error: 'Partnership agreement not found' }, { status: 404 })
    }

    // Verify mechanic owns this agreement
    if (agreement.mechanic_id !== mechanic.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify agreement is active
    if (agreement.status !== 'active') {
      return NextResponse.json({
        error: 'Partnership agreement must be active to record jobs'
      }, { status: 400 })
    }

    const program = agreement.workshop_partnership_programs as any

    // Calculate revenue split based on program type
    const platformFeeRate = 0.15 // 15% platform fee
    const platformFee = total_revenue * platformFeeRate
    const revenueAfterPlatformFee = total_revenue - platformFee

    let mechanicShare = 0
    let workshopShare = 0

    if (program.program_type === 'bay_rental') {
      // Bay rental: mechanic keeps all revenue after platform fee
      mechanicShare = revenueAfterPlatformFee
      workshopShare = 0
    } else if (program.program_type === 'revenue_share') {
      // Revenue share: split based on percentages
      mechanicShare = revenueAfterPlatformFee * (program.mechanic_percentage / 100)
      workshopShare = revenueAfterPlatformFee * (program.workshop_percentage / 100)
    } else if (program.program_type === 'membership') {
      // Membership: mechanic keeps all revenue after platform fee
      // (monthly fee already paid separately)
      mechanicShare = revenueAfterPlatformFee
      workshopShare = 0
    }

    // Create revenue split record
    const revenueSplitData = {
      agreement_id,
      bay_booking_id: bay_booking_id || null,
      mechanic_id: mechanic.id,
      workshop_id: agreement.workshop_id,
      program_id: agreement.program_id,
      total_revenue,
      platform_fee,
      mechanic_share: mechanicShare,
      workshop_share: workshopShare,
      parts_cost: parts_cost || 0,
      labor_cost: labor_cost || 0,
      split_percentage_mechanic: program.program_type === 'revenue_share' ? program.mechanic_percentage : 100,
      split_percentage_workshop: program.program_type === 'revenue_share' ? program.workshop_percentage : 0,
      job_details: {
        customer_name,
        vehicle_info,
        job_description
      },
      completed_at: completed_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data: revenueSplit, error: revenueSplitError } = await supabaseAdmin
      .from('partnership_revenue_splits')
      .insert(revenueSplitData)
      .select()
      .single()

    if (revenueSplitError) {
      console.error('[JOBS API] Revenue split error:', revenueSplitError)
      return NextResponse.json({ error: 'Failed to record job revenue' }, { status: 500 })
    }

    // Create earnings breakdown record
    const earningsData = {
      mechanic_id: mechanic.id,
      revenue_split_id: revenueSplit.id,
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      total_jobs: 1,
      total_revenue,
      platform_fees: platformFee,
      workshop_fees: workshopShare,
      net_earnings: mechanicShare,
      virtual_earnings: 0,
      physical_earnings: mechanicShare,
      created_at: new Date().toISOString()
    }

    const { error: earningsError } = await supabaseAdmin
      .from('mechanic_earnings_breakdown')
      .insert(earningsData)

    if (earningsError) {
      console.error('[JOBS API] Earnings breakdown error:', earningsError)
      // Don't fail the request
    }

    // Update bay booking status if provided
    if (bay_booking_id) {
      await supabaseAdmin
        .from('bay_bookings')
        .update({
          status: 'completed',
          actual_revenue: total_revenue,
          updated_at: new Date().toISOString()
        })
        .eq('id', bay_booking_id)
    }

    return NextResponse.json({
      success: true,
      revenue_split: revenueSplit,
      breakdown: {
        total_revenue,
        platform_fee,
        mechanic_share: mechanicShare,
        workshop_share: workshopShare,
        platform_fee_percentage: platformFeeRate * 100
      },
      message: 'Job recorded successfully'
    })

  } catch (error) {
    console.error('[JOBS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/mechanics/jobs
 *
 * Get mechanic's completed jobs
 * Query params:
 *   - from_date: ISO date
 *   - to_date: ISO date
 *   - limit: number (default: 50)
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Query params
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get revenue splits (completed jobs)
    let query = supabaseAdmin
      .from('partnership_revenue_splits')
      .select(`
        *,
        organizations!partnership_revenue_splits_workshop_id_fkey (
          id,
          name,
          city,
          province
        ),
        workshop_partnership_programs!partnership_revenue_splits_program_id_fkey (
          id,
          program_name,
          program_type
        )
      `)
      .eq('mechanic_id', mechanic.id)

    if (fromDate) {
      query = query.gte('completed_at', fromDate)
    }

    if (toDate) {
      query = query.lte('completed_at', toDate)
    }

    const { data: jobs, error: jobsError } = await query
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (jobsError) {
      console.error('[JOBS API] Fetch error:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({
      jobs: jobs || []
    })

  } catch (error) {
    console.error('[JOBS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
