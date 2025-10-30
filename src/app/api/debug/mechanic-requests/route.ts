import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Debug endpoint to check session requests visibility
 * GET /api/debug/mechanic-requests?email=mechanic.workshop@test.com
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mechanicEmail = searchParams.get('email') || 'mechanic.workshop@test.com'

    console.log('[DEBUG] Checking mechanic requests for:', mechanicEmail)

    // 1. Find the mechanic
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email, service_tier, workshop_id, user_id')
      .eq('email', mechanicEmail)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({
        error: 'Mechanic not found',
        email: mechanicEmail,
        details: mechanicError?.message
      }, { status: 404 })
    }

    console.log('[DEBUG] Found mechanic:', mechanic)

    // 2. Get all pending session requests (no filters)
    const { data: allRequests, error: allRequestsError } = await supabaseAdmin
      .from('session_requests')
      .select(`
        id,
        status,
        session_type,
        workshop_id,
        customer_id,
        customer_name,
        created_at,
        plan_code
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (allRequestsError) {
      return NextResponse.json({
        error: 'Failed to fetch requests',
        details: allRequestsError.message
      }, { status: 500 })
    }

    console.log('[DEBUG] All pending requests:', allRequests?.length || 0)

    // 3. Apply filtering logic
    let filteredRequests = allRequests || []

    if (mechanic.service_tier === 'virtual_only') {
      filteredRequests = filteredRequests.filter(r =>
        ['virtual', 'diagnostic', 'chat'].includes(r.session_type)
      )
    } else if (mechanic.service_tier === 'workshop_affiliated' && mechanic.workshop_id) {
      filteredRequests = filteredRequests.filter(r =>
        !r.workshop_id || r.workshop_id === mechanic.workshop_id
      )
    } else {
      filteredRequests = filteredRequests.filter(r => !r.workshop_id)
    }

    // 4. Get customer details for the last request
    let lastRequestCustomer = null
    if (filteredRequests.length > 0) {
      const lastRequest = filteredRequests[0]
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name, email')
        .eq('id', lastRequest.customer_id)
        .single()

      lastRequestCustomer = customer
    }

    return NextResponse.json({
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        email: mechanic.email,
        service_tier: mechanic.service_tier,
        workshop_id: mechanic.workshop_id,
        user_id: mechanic.user_id
      },
      requests: {
        total_pending: allRequests?.length || 0,
        visible_to_mechanic: filteredRequests.length,
        all_requests: allRequests?.map(r => ({
          id: r.id,
          session_type: r.session_type,
          workshop_id: r.workshop_id,
          customer_name: r.customer_name,
          created_at: r.created_at
        })) || [],
        filtered_requests: filteredRequests.map(r => ({
          id: r.id,
          session_type: r.session_type,
          workshop_id: r.workshop_id,
          customer_name: r.customer_name,
          created_at: r.created_at
        }))
      },
      last_request_customer: lastRequestCustomer,
      filtering_applied: {
        service_tier: mechanic.service_tier,
        workshop_id: mechanic.workshop_id,
        rule: mechanic.service_tier === 'virtual_only'
          ? 'Virtual-only: showing virtual/diagnostic/chat only'
          : mechanic.service_tier === 'workshop_affiliated' && mechanic.workshop_id
          ? `Workshop-affiliated: showing workshop ${mechanic.workshop_id} and general requests`
          : 'Independent: showing general requests only'
      }
    })

  } catch (error: any) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
