import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanics/statements
 *
 * Get monthly earnings statements
 * Query params:
 *   - year: number (required)
 *   - month: number (1-12, optional - if omitted, returns all months for the year)
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Query params
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

    if (!year) {
      return NextResponse.json({
        error: 'year parameter is required'
      }, { status: 400 })
    }

    // Calculate date range
    let startDate: Date
    let endDate: Date

    if (month) {
      // Specific month
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59)
    } else {
      // Entire year
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31, 23, 59, 59)
    }

    // Get virtual session earnings
    const { data: virtualSessions } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('total_price, updated_at, session_type')
      .eq('mechanic_id', session.mechanic_id)
      .eq('status', 'completed')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())

    const virtualEarnings = virtualSessions?.reduce((sum, s) => sum + (s.total_price * 0.85), 0) || 0
    const virtualJobs = virtualSessions?.length || 0

    // Get physical job earnings (revenue splits)
    const { data: physicalJobs } = await supabaseAdmin
      .from('partnership_revenue_splits')
      .select('*, workshop_partnership_programs!partnership_revenue_splits_program_id_fkey (program_type)')
      .eq('mechanic_id', session.mechanic_id)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())

    const physicalRevenue = physicalJobs?.reduce((sum, j) => sum + j.total_revenue, 0) || 0
    const physicalPlatformFees = physicalJobs?.reduce((sum, j) => sum + j.platform_fee, 0) || 0
    const physicalWorkshopFees = physicalJobs?.reduce((sum, j) => sum + j.workshop_share, 0) || 0
    const physicalEarnings = physicalJobs?.reduce((sum, j) => sum + j.mechanic_share, 0) || 0
    const physicalJobsCount = physicalJobs?.length || 0

    // Get bay booking costs (for bay rental programs)
    const { data: bayBookings } = await supabaseAdmin
      .from('bay_bookings')
      .select(`
        *,
        partnership_agreements!bay_bookings_agreement_id_fkey (
          workshop_partnership_programs!partnership_agreements_program_id_fkey (
            program_type,
            daily_rate,
            hourly_rate
          )
        )
      `)
      .eq('mechanic_id', session.mechanic_id)
      .eq('status', 'completed')
      .gte('booking_date', startDate.toISOString().split('T')[0])
      .lte('booking_date', endDate.toISOString().split('T')[0])

    let bayRentalCosts = 0
    bayBookings?.forEach(booking => {
      const program = (booking.partnership_agreements as any)?.workshop_partnership_programs
      if (program?.program_type === 'bay_rental') {
        if (program.daily_rate) {
          bayRentalCosts += program.daily_rate
        } else if (program.hourly_rate && booking.duration_hours) {
          bayRentalCosts += program.hourly_rate * booking.duration_hours
        }
      }
    })

    // Get membership fees (for membership programs)
    const { data: activeAgreements } = await supabaseAdmin
      .from('partnership_agreements')
      .select(`
        *,
        workshop_partnership_programs!partnership_agreements_program_id_fkey (
          program_type,
          monthly_fee
        )
      `)
      .eq('mechanic_id', session.mechanic_id)
      .eq('status', 'active')

    let membershipFees = 0
    const monthsInPeriod = month ? 1 : 12
    activeAgreements?.forEach(agreement => {
      const program = (agreement.workshop_partnership_programs as any)
      if (program?.program_type === 'membership' && program.monthly_fee) {
        membershipFees += program.monthly_fee * monthsInPeriod
      }
    })

    // Calculate totals
    const totalRevenue = (virtualSessions?.reduce((sum, s) => sum + s.total_price, 0) || 0) + physicalRevenue
    const totalPlatformFees = (virtualSessions?.reduce((sum, s) => sum + (s.total_price * 0.15), 0) || 0) + physicalPlatformFees
    const totalWorkshopFees = physicalWorkshopFees
    const totalBayRentalCosts = bayRentalCosts
    const totalMembershipFees = membershipFees
    const totalExpenses = totalPlatformFees + totalWorkshopFees + totalBayRentalCosts + totalMembershipFees
    const netEarnings = virtualEarnings + physicalEarnings - totalBayRentalCosts - totalMembershipFees
    const totalJobs = virtualJobs + physicalJobsCount

    // Build statement
    const statement = {
      period: {
        year,
        month: month || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      summary: {
        total_jobs: totalJobs,
        virtual_jobs: virtualJobs,
        physical_jobs: physicalJobsCount,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_earnings: netEarnings
      },
      income: {
        virtual_earnings: virtualEarnings,
        physical_earnings: physicalEarnings,
        total_gross_income: virtualEarnings + physicalEarnings
      },
      expenses: {
        platform_fees: totalPlatformFees,
        workshop_fees: totalWorkshopFees,
        bay_rental_costs: totalBayRentalCosts,
        membership_fees: totalMembershipFees,
        total: totalExpenses
      },
      breakdown_by_type: {
        virtual: {
          jobs: virtualJobs,
          revenue: virtualSessions?.reduce((sum, s) => sum + s.total_price, 0) || 0,
          platform_fees: virtualSessions?.reduce((sum, s) => sum + (s.total_price * 0.15), 0) || 0,
          earnings: virtualEarnings
        },
        physical: {
          jobs: physicalJobsCount,
          revenue: physicalRevenue,
          platform_fees: physicalPlatformFees,
          workshop_fees: physicalWorkshopFees,
          earnings: physicalEarnings
        }
      },
      virtual_sessions_detail: virtualSessions?.map(s => ({
        date: s.updated_at,
        type: s.session_type,
        revenue: s.total_price,
        platform_fee: s.total_price * 0.15,
        earnings: s.total_price * 0.85
      })) || [],
      physical_jobs_detail: physicalJobs?.map(j => ({
        date: j.completed_at,
        customer: (j.job_details as any)?.customer_name || 'Unknown',
        vehicle: (j.job_details as any)?.vehicle_info || '',
        revenue: j.total_revenue,
        platform_fee: j.platform_fee,
        workshop_fee: j.workshop_share,
        earnings: j.mechanic_share
      })) || []
    }

    return NextResponse.json({
      statement
    })

  } catch (error) {
    console.error('[STATEMENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
