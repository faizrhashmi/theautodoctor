/**
 * Customer Draft RFQs API
 *
 * GET: Fetch all draft RFQs created by mechanics for this customer
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

    // Fetch all draft RFQs for this customer
    const { data: drafts, error: draftsError } = await supabase
      .from('workshop_rfq_marketplace')
      .select(`
        *,
        mechanics!escalating_mechanic_id(id, full_name, profile_photo_url, rating),
        diagnostic_sessions!diagnostic_session_id(id, created_at, status),
        vehicles!vehicle_id(id, year, make, model, mileage)
      `)
      .eq('customer_id', user.id)
      .eq('rfq_status', 'draft')
      .order('created_at', { ascending: false })

    if (draftsError) {
      console.error('[Customer Drafts] Error fetching drafts:', draftsError)
      return NextResponse.json({ error: 'Failed to fetch draft RFQs' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      drafts: drafts || [],
      count: drafts?.length || 0
    })

  } catch (error) {
    console.error('[Customer Drafts] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
