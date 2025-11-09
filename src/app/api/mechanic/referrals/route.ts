/**
 * Mechanic Referrals API
 *
 * GET: Fetch mechanic's referral earnings and statistics
 */

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic profile
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 403 })
    }

    // Fetch referral earnings with details
    const { data: referrals, error: referralsError } = await supabase
      .from('mechanic_referral_earnings')
      .select(`
        *,
        rfq:rfq_id(title, description, urgency, vehicle_make, vehicle_model, vehicle_year),
        customer:customer_id(id, full_name, email),
        workshop:workshop_id(id, name, city, state_province),
        bid:bid_id(quote_amount, created_at)
      `)
      .eq('mechanic_id', mechanic.id)
      .order('earned_at', { ascending: false })

    if (referralsError) {
      console.error('[Mechanic Referrals] Error:', referralsError)
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = {
      total_referrals: referrals?.length || 0,
      pending_referrals: referrals?.filter(r => r.status === 'pending').length || 0,
      paid_referrals: referrals?.filter(r => r.status === 'paid').length || 0,
      total_earned: referrals?.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0) || 0,
      pending_earnings: referrals?.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.commission_amount || 0), 0) || 0,
      paid_earnings: referrals?.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.commission_amount || 0), 0) || 0,
      avg_commission: referrals?.length ? (referrals.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0) / referrals.length) : 0,
    }

    return NextResponse.json({
      success: true,
      referrals: referrals || [],
      summary
    })

  } catch (error) {
    console.error('[Mechanic Referrals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
