/**
 * GET /api/customer/scheduled-appointments
 * Get upcoming scheduled appointments for the authenticated customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get customer's upcoming appointments
    const now = new Date()

    const { data: appointments, error: appointmentsError } = await supabase
      .from('sessions')
      .select(`
        id,
        scheduled_for,
        type,
        status,
        waiver_signed_at,
        mechanic:profiles!mechanic_user_id(full_name),
        mechanic_profile:mechanics!mechanic_user_id(workshop_name)
      `)
      .eq('customer_user_id', user.id)
      .in('status', ['scheduled', 'waiting'])
      .gte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (appointmentsError) {
      console.error('[customer/scheduled-appointments] Error fetching appointments:', appointmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      )
    }

    // 3. Transform data for frontend
    const transformedAppointments = (appointments || []).map((appointment: any) => ({
      id: appointment.id,
      mechanic_name: appointment.mechanic?.full_name || 'Mechanic',
      mechanic_workshop: appointment.mechanic_profile?.workshop_name || null,
      scheduled_for: appointment.scheduled_for,
      type: appointment.type,
      waiver_signed_at: appointment.waiver_signed_at,
      status: appointment.status
    }))

    return NextResponse.json({
      success: true,
      appointments: transformedAppointments,
      count: transformedAppointments.length
    })

  } catch (error: any) {
    console.error('[customer/scheduled-appointments] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
