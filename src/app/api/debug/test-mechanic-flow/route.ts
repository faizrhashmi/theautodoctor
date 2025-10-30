import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * DEBUG ENDPOINT: Test complete mechanic request flow
 *
 * GET /api/debug/test-mechanic-flow?mechanicEmail=mechanic.workshop@test.com
 *
 * Tests:
 * 1. Mechanic authentication
 * 2. Mechanic profile fetch
 * 3. Session requests visibility
 * 4. Database queries
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mechanicEmail = searchParams.get('mechanicEmail') || 'mechanic.workshop@test.com'

  const results: any = {
    timestamp: new Date().toISOString(),
    mechanicEmail,
    tests: {},
    errors: [],
    warnings: []
  }

  try {
    // TEST 1: Find mechanic by email
    console.log('[DEBUG] Test 1: Finding mechanic by email...')
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, user_id, email, service_tier, workshop_id, can_accept_sessions')
      .eq('email', mechanicEmail)
      .single()

    if (mechanicError || !mechanic) {
      results.tests.mechanicLookup = {
        success: false,
        error: mechanicError?.message || 'Mechanic not found',
        details: mechanicError
      }
      results.errors.push('Mechanic not found in database')
      return NextResponse.json(results, { status: 404 })
    }

    results.tests.mechanicLookup = {
      success: true,
      mechanic: {
        id: mechanic.id,
        user_id: mechanic.user_id,
        email: mechanic.email,
        service_tier: mechanic.service_tier,
        workshop_id: mechanic.workshop_id,
        can_accept_sessions: mechanic.can_accept_sessions
      }
    }

    // TEST 2: Check if user_id exists in auth.users
    if (mechanic.user_id) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
        mechanic.user_id
      )

      results.tests.authUserCheck = {
        success: !authError && !!authUser.user,
        user_id: mechanic.user_id,
        exists_in_auth: !!authUser.user,
        email: authUser.user?.email,
        error: authError?.message
      }

      if (!authUser.user) {
        results.warnings.push('Mechanic has user_id but user does not exist in auth.users!')
      }
    } else {
      results.tests.authUserCheck = {
        success: false,
        error: 'Mechanic has no user_id - not linked to Supabase Auth'
      }
      results.errors.push('Mechanic not linked to Supabase Auth')
    }

    // TEST 3: Fetch all pending session_requests
    console.log('[DEBUG] Test 3: Fetching all pending session_requests...')
    const { data: allRequests, error: allRequestsError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id, session_type, status, created_at, workshop_id, mechanic_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    results.tests.allPendingRequests = {
      success: !allRequestsError,
      count: allRequests?.length || 0,
      requests: allRequests?.map(r => ({
        id: r.id,
        customer_id: r.customer_id,
        session_type: r.session_type,
        workshop_id: r.workshop_id,
        mechanic_id: r.mechanic_id,
        created_at: r.created_at
      })),
      error: allRequestsError?.message
    }

    if (allRequestsError) {
      results.errors.push('Failed to fetch pending requests: ' + allRequestsError.message)
    }

    // TEST 4: Apply filtering logic (same as API endpoint)
    console.log('[DEBUG] Test 4: Testing filtering logic...')
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

    results.tests.filteringLogic = {
      success: true,
      rule: mechanic.service_tier === 'virtual_only'
        ? 'Virtual-only: showing virtual/diagnostic/chat only'
        : mechanic.service_tier === 'workshop_affiliated' && mechanic.workshop_id
        ? `Workshop-affiliated: showing workshop ${mechanic.workshop_id} and general requests`
        : 'Independent: showing general requests only',
      beforeFiltering: allRequests?.length || 0,
      afterFiltering: filteredRequests.length,
      filtered: filteredRequests.map(r => ({
        id: r.id,
        session_type: r.session_type,
        workshop_id: r.workshop_id
      }))
    }

    // TEST 5: Test API endpoint authentication
    console.log('[DEBUG] Test 5: Testing requireMechanicAPI...')
    if (mechanic.user_id) {
      // Create a mock request with auth cookies
      const testClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      })

      const { data: { user }, error: userError } = await testClient.auth.getUser()

      results.tests.currentAuthUser = {
        success: !userError && !!user,
        authenticated: !!user,
        user_id: user?.id,
        email: user?.email,
        matches_mechanic: user?.id === mechanic.user_id,
        error: userError?.message
      }

      if (!user) {
        results.warnings.push('No authenticated user in current request - mechanic not logged in?')
      } else if (user.id !== mechanic.user_id) {
        results.warnings.push('Authenticated user does not match mechanic user_id!')
      }
    }

    // TEST 6: Check RLS policies
    console.log('[DEBUG] Test 6: Checking RLS policies...')
    const { data: rlsStatus } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .limit(0)

    results.tests.rls = {
      note: 'API uses supabaseAdmin which bypasses RLS',
      bypassesRLS: true
    }

    // SUMMARY
    results.summary = {
      mechanicFound: !!mechanic,
      linkedToAuth: !!mechanic.user_id && results.tests.authUserCheck?.success,
      pendingRequestsExist: (allRequests?.length || 0) > 0,
      visibleToMechanic: filteredRequests.length > 0,
      currentlyAuthenticated: results.tests.currentAuthUser?.success || false
    }

    // Recommendations
    results.recommendations = []

    if (!mechanic.user_id) {
      results.recommendations.push('CRITICAL: Link mechanic to Supabase Auth by setting user_id')
    }

    if (!mechanic.can_accept_sessions) {
      results.recommendations.push('Set can_accept_sessions=true to allow mechanic to see requests')
    }

    if ((allRequests?.length || 0) > 0 && filteredRequests.length === 0) {
      results.recommendations.push('Requests exist but filtering is hiding them - check service_tier and workshop_id')
    }

    if (!results.tests.currentAuthUser?.success) {
      results.recommendations.push('Mechanic needs to login via /mechanic/login to authenticate')
    }

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[DEBUG] Test flow error:', error)
    results.errors.push(error.message)
    return NextResponse.json(results, { status: 500 })
  }
}
