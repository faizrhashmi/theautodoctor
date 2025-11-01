import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { withDebugAuth } from '@/lib/debugAuth'


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * GET /api/debug/test-mechanic-rls
 *
 * Test if mechanic can query their own record (tests RLS policies)
 * This simulates what the dashboard does
 */
async function getHandler(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  }

  try {
    // Create server client (reads cookies, respects RLS)
    const supabaseAsUser = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Test 1: Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabaseAsUser.auth.getSession()

    results.tests.push({
      test: 1,
      name: 'Get Session',
      success: !!session,
      session_exists: !!session,
      user_id: session?.user?.id || null,
      user_email: session?.user?.email || null,
      error: sessionError?.message || null,
    })

    if (!session?.user) {
      results.error = 'Not authenticated - please login first'
      results.instructions = [
        '1. Login as workshop.mechanic@test.com',
        '2. Then refresh this page',
        '3. You should be authenticated',
      ]
      return NextResponse.json(results, { status: 401 })
    }

    // Test 2: Query profiles table (simulates dashboard line 156-160)
    const { data: profile, error: profileError } = await supabaseAsUser
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    results.tests.push({
      test: 2,
      name: 'Query Profiles Table',
      success: !!profile && !profileError,
      profile_found: !!profile,
      role: profile?.role || null,
      error: profileError?.message || null,
      error_code: profileError?.code || null,
      error_details: profileError?.details || null,
      error_hint: profileError?.hint || null,
    })

    // Test 3: Query mechanics table (simulates dashboard line 170-174)
    // THIS IS THE CRITICAL TEST - if this fails, dashboard loops
    const { data: mechanic, error: mechanicError } = await supabaseAsUser
      .from('mechanics')
      .select('id, service_tier')
      .eq('user_id', session.user.id)
      .single()

    results.tests.push({
      test: 3,
      name: 'Query Mechanics Table (AS USER - RLS APPLIES)',
      success: !!mechanic && !mechanicError,
      mechanic_found: !!mechanic,
      mechanic_id: mechanic?.id || null,
      service_tier: mechanic?.service_tier || null,
      error: mechanicError?.message || null,
      error_code: mechanicError?.code || null,
      error_details: mechanicError?.details || null,
      error_hint: mechanicError?.hint || null,
      rls_blocking: !!mechanicError && (mechanicError.code === 'PGRST116' || mechanicError.code === '42501'),
    })

    // Test 4: Query mechanics table with admin (bypasses RLS)
    const { data: mechanicAdmin, error: mechanicAdminError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, user_id, can_accept_sessions')
      .eq('user_id', session.user.id)
      .single()

    results.tests.push({
      test: 4,
      name: 'Query Mechanics Table (AS ADMIN - BYPASSES RLS)',
      success: !!mechanicAdmin && !mechanicAdminError,
      mechanic_found: !!mechanicAdmin,
      data: mechanicAdmin,
      error: mechanicAdminError?.message || null,
      note: 'This shows if mechanic record exists regardless of RLS',
    })

    // Test 5: Call get_authenticated_mechanic_id() function
    const { data: functionResult, error: functionError } = await supabaseAsUser
      .rpc('get_authenticated_mechanic_id')

    results.tests.push({
      test: 5,
      name: 'Call get_authenticated_mechanic_id() Function',
      success: !!functionResult && !functionError,
      result: functionResult,
      error: functionError?.message || null,
      error_code: functionError?.code || null,
      note: 'This function is used by RLS policies',
    })

    // Summary
    const test3 = results.tests[2] // The critical mechanics query
    const test4 = results.tests[3] // Admin query

    if (test3.success) {
      results.summary = {
        status: '✅ SUCCESS',
        message: 'RLS is working correctly - mechanic can query their own record',
        dashboard_should_work: true,
      }
    } else if (test4.success && !test3.success) {
      results.summary = {
        status: '🔥 RLS BLOCKING',
        message: 'Mechanic record exists but RLS is blocking access',
        problem: 'RLS policy on mechanics table is preventing the query',
        dashboard_will_fail: true,
        causes_infinite_loop: true,
      }

      if (test3.rls_blocking) {
        results.recommendations = [
          '🔥 CRITICAL: RLS is blocking mechanic table access',
          '→ This causes the infinite login loop you\'re experiencing',
          '',
          'Possible causes:',
          '1. Migration 99999999_fix_mechanic_auth_function.sql not applied correctly',
          '2. Wrong RLS policy is active on mechanics table',
          '3. get_authenticated_mechanic_id() function still broken',
          '',
          'To fix:',
          '1. Go to Supabase Dashboard → SQL Editor',
          '2. Run: DROP POLICY IF EXISTS "Mechanics can view their own profile" ON mechanics;',
          '3. Run: DROP POLICY IF EXISTS "Mechanics can view own profile" ON mechanics;',
          '4. Run: CREATE POLICY "Mechanics can view own profile" ON mechanics FOR SELECT USING (user_id = auth.uid());',
          '5. Refresh mechanic dashboard',
        ]
      }
    } else {
      results.summary = {
        status: '❌ MECHANIC RECORD MISSING',
        message: 'Mechanic record not found in database',
        dashboard_will_fail: true,
      }
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[test-mechanic-rls] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack,
      tests: results.tests,
    }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
