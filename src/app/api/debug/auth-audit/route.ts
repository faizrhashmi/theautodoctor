import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
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
 * GET /api/debug/auth-audit?email=workshop.mechanic@test.com
 *
 * Complete audit of authentication and RLS for a mechanic user
 */
async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') || 'workshop.mechanic@test.com'

  const results: any = {
    timestamp: new Date().toISOString(),
    email,
    checks: {},
  }

  try {
    // ========================================================================
    // Step 1: Check if user exists in auth.users
    // ========================================================================
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authUsers.users.find(u => u.email === email)

    results.checks.authUser = {
      exists: !!authUser,
      id: authUser?.id || null,
      email: authUser?.email || null,
      email_confirmed: authUser?.email_confirmed_at ? true : false,
      created_at: authUser?.created_at || null,
    }

    if (!authUser) {
      results.error = 'User not found in auth.users'
      return NextResponse.json(results, { status: 404 })
    }

    // ========================================================================
    // Step 2: Check profile table
    // ========================================================================
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, created_at')
      .eq('id', authUser.id)
      .maybeSingle()

    results.checks.profile = {
      exists: !!profile,
      role: profile?.role || null,
      error: profileError?.message || null,
      data: profile,
    }

    // ========================================================================
    // Step 3: Check mechanics table (using admin - bypasses RLS)
    // ========================================================================
    const { data: mechanicAdmin, error: mechanicAdminError } = await supabaseAdmin
      .from('mechanics')
      .select('id, user_id, email, service_tier, account_type, workshop_id, can_accept_sessions')
      .eq('user_id', authUser.id)
      .maybeSingle()

    results.checks.mechanicAdmin = {
      exists: !!mechanicAdmin,
      error: mechanicAdminError?.message || null,
      data: mechanicAdmin,
      note: 'Queried with admin client (bypasses RLS)',
    }

    // ========================================================================
    // Step 4: Try to query mechanics table AS the user (tests RLS)
    // ========================================================================

    // Create a server client to simulate user auth
    const supabaseAsUser = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Check if there's an authenticated session in the request
    const { data: { session }, error: sessionError } = await supabaseAsUser.auth.getSession()

    results.checks.currentSession = {
      authenticated: !!session,
      user_id: session?.user?.id || null,
      user_email: session?.user?.email || null,
      matches_target_user: session?.user?.id === authUser.id,
      error: sessionError?.message || null,
    }

    // Try querying mechanics table as the authenticated user (if any)
    if (session?.user) {
      const { data: mechanicAsUser, error: mechanicAsUserError } = await supabaseAsUser
        .from('mechanics')
        .select('id, user_id, email, service_tier')
        .eq('user_id', session.user.id)
        .maybeSingle()

      results.checks.mechanicAsUser = {
        exists: !!mechanicAsUser,
        error: mechanicAsUserError?.message || null,
        error_code: mechanicAsUserError?.code || null,
        error_details: mechanicAsUserError?.details || null,
        data: mechanicAsUser,
        note: 'Queried as authenticated user (RLS applies)',
        rls_blocked: !!mechanicAsUserError && mechanicAsUserError.code === 'PGRST116',
      }
    } else {
      results.checks.mechanicAsUser = {
        skipped: true,
        reason: 'No authenticated session in request',
      }
    }

    // ========================================================================
    // Step 5: Check RLS policies on mechanics table
    // ========================================================================
    const { data: mechanicPolicies, error: policiesError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE tablename = 'mechanics'
          ORDER BY policyname;
        `
      })
      .catch(() => ({ data: null, error: { message: 'Cannot query pg_policies via RPC' } }))

    results.checks.rlsPolicies = {
      note: 'RLS policies on mechanics table',
      canQuery: !policiesError,
      error: policiesError?.message || null,
      policies: mechanicPolicies || 'Cannot query - check Supabase Dashboard',
    }

    // ========================================================================
    // Step 6: Check if get_authenticated_mechanic_id() function exists
    // ========================================================================
    const { data: functionCheck, error: functionError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT
            proname as function_name,
            prosrc as source_code,
            pg_get_functiondef(oid) as full_definition
          FROM pg_proc
          WHERE proname = 'get_authenticated_mechanic_id';
        `
      })
      .catch(() => ({ data: null, error: { message: 'Cannot query pg_proc via RPC' } }))

    results.checks.authFunction = {
      note: 'get_authenticated_mechanic_id() function',
      canQuery: !functionError,
      error: functionError?.message || null,
      function: functionCheck || 'Cannot query - check Supabase Dashboard',
      migrationApplied: functionCheck && functionCheck[0]?.source_code?.includes('auth.uid()') ? true : false,
    }

    // ========================================================================
    // Step 7: Try calling the function directly
    // ========================================================================
    if (session?.user) {
      const { data: functionResult, error: functionCallError } = await supabaseAsUser
        .rpc('get_authenticated_mechanic_id')
        .catch((e) => ({ data: null, error: e }))

      results.checks.authFunctionCall = {
        result: functionResult,
        error: functionCallError?.message || null,
        note: 'Called as authenticated user',
      }
    }

    // ========================================================================
    // Step 8: Check organization membership (for workshop access)
    // ========================================================================
    const { data: orgMembership, error: orgError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        organization_id,
        organizations (
          id,
          name,
          organization_type
        )
      `)
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .maybeSingle()

    results.checks.workshopAccess = {
      exists: !!orgMembership,
      error: orgError?.message || null,
      membership: orgMembership,
    }

    // ========================================================================
    // Summary and Recommendations
    // ========================================================================
    results.summary = {
      can_login: !!authUser && !!profile && profile.role === 'mechanic',
      can_access_mechanic_dashboard: !!mechanicAdmin && mechanicAdmin.can_accept_sessions,
      can_access_workshop_dashboard: !!orgMembership,
      rls_blocking: results.checks.mechanicAsUser?.rls_blocked === true,
      migration_needed: !results.checks.authFunction?.migrationApplied,
    }

    results.recommendations = []

    if (!profile) {
      results.recommendations.push('❌ Create profile entry with role=mechanic')
    } else if (profile.role !== 'mechanic') {
      results.recommendations.push(`❌ Update profile.role from '${profile.role}' to 'mechanic'`)
    }

    if (!mechanicAdmin) {
      results.recommendations.push('❌ Create mechanics table entry with user_id linked')
    } else if (!mechanicAdmin.can_accept_sessions) {
      results.recommendations.push('❌ Set can_accept_sessions = true')
    }

    if (results.checks.mechanicAsUser?.rls_blocked) {
      results.recommendations.push('🔥 CRITICAL: RLS is blocking mechanic table access - this causes infinite login loop!')
      results.recommendations.push('→ Apply migration: 99999999_fix_mechanic_auth_function.sql')
    }

    if (!results.checks.authFunction?.migrationApplied) {
      results.recommendations.push('⚠️  Migration 99999999_fix_mechanic_auth_function.sql NOT applied')
      results.recommendations.push('→ Run SQL from URGENT_FIX_MECHANIC_DASHBOARD.md')
    }

    if (results.summary.can_login && results.summary.can_access_mechanic_dashboard && !results.summary.rls_blocking) {
      results.recommendations.push('✅ User should be able to login and access mechanic dashboard')
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[auth-audit] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error during audit',
      message: error.message,
      checks: results.checks,
    }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
