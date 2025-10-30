import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * POST /api/debug/fix-mechanic-auth
 *
 * Fix the get_authenticated_mechanic_id() function that still references deleted mechanic_sessions table
 * This is causing the infinite loading loop on mechanic dashboard
 */
export async function POST(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    // Step 1: Drop the old function
    const dropFunctionSQL = `
      DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;
    `

    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', { sql: dropFunctionSQL }).catch(() => {
      // If rpc doesn't exist, use direct SQL
      return supabaseAdmin.from('_sqlrunner').select('*').limit(0) // Dummy query
    })

    results.steps.push({
      step: 1,
      action: 'Attempted to drop old function',
      note: 'Function may not exist or may need manual drop',
    })

    // Step 2: Create the new function that uses Supabase Auth
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID AS $$
DECLARE
  mech_id UUID;
  user_id UUID;
BEGIN
  -- Get authenticated user from Supabase Auth (not old cookie!)
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic by user_id (not token!)
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = user_id
  AND can_accept_sessions = true;

  RETURN mech_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    `

    // We need to execute raw SQL - let's use a different approach
    // Since we can't execute arbitrary SQL through the API easily, let's update the RLS policies directly

    // Step 3: Drop old RLS policies that use get_authenticated_mechanic_id()
    results.steps.push({
      step: 2,
      action: 'Need to update RLS policies',
      note: 'Updating policies to use auth.uid() directly instead of get_authenticated_mechanic_id()',
    })

    // Step 4: Update the SELECT policy to use auth.uid() directly
    const updatePolicySQL = `
-- Drop old policies
DROP POLICY IF EXISTS "Mechanics can view their own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can view own profile" ON public.mechanics;

-- Create new policy using auth.uid() directly
CREATE POLICY "Mechanics can view own profile"
  ON public.mechanics
  FOR SELECT
  USING (user_id = auth.uid());
    `

    results.steps.push({
      step: 3,
      action: 'Created SQL to update RLS policies',
      sql: updatePolicySQL,
    })

    // We'll return the SQL for manual execution
    return NextResponse.json({
      success: false,
      message: 'Cannot execute raw SQL through API - manual intervention required',
      problem: 'The get_authenticated_mechanic_id() function references deleted mechanic_sessions table',
      solution: 'Run the migration file manually or execute the SQL below',
      sql_to_execute: `
-- ============================================================================
-- FIX: Update get_authenticated_mechanic_id() function
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;

-- Create new function that uses Supabase Auth
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID AS $func$
DECLARE
  mech_id UUID;
  user_id UUID;
BEGIN
  -- Get authenticated user from Supabase Auth
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up mechanic by user_id
  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = user_id
  AND can_accept_sessions = true;

  RETURN mech_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- FIX: Update RLS policies to use auth.uid() directly
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Mechanics can view their own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can view own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can update their own profile" ON public.mechanics;
DROP POLICY IF EXISTS "Mechanics can update own profile" ON public.mechanics;

-- Create new SELECT policy
CREATE POLICY "Mechanics can view own profile"
  ON public.mechanics
  FOR SELECT
  USING (user_id = auth.uid());

-- Create new UPDATE policy
CREATE POLICY "Mechanics can update own profile"
  ON public.mechanics
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify it worked
SELECT
  'Policy updated successfully' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'mechanics'
AND policyname LIKE '%Mechanics can%own profile%';
      `,
      steps: results.steps,
      instructions: [
        '1. Copy the SQL above',
        '2. Go to Supabase Dashboard → SQL Editor',
        '3. Paste and execute the SQL',
        '4. Refresh the mechanic dashboard',
        'OR',
        '5. Use the migration file: supabase/migrations/99999999_fix_mechanic_auth_function.sql',
      ],
    }, { status: 200 })

  } catch (error: any) {
    console.error('[fix-mechanic-auth] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

/**
 * GET /api/debug/fix-mechanic-auth
 *
 * Check the current status of the mechanic auth function
 */
export async function GET(req: NextRequest) {
  try {
    // Check if function exists and what it contains
    const { data: functions, error: funcError } = await supabaseAdmin
      .from('pg_proc')
      .select('*')
      .limit(1)
      .catch(() => ({ data: null, error: null }))

    // Check RLS policies on mechanics table
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .limit(1)
      .catch(() => ({ data: null, error: null }))

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      message: 'Use POST to get SQL for fixing the auth function',
      problem: 'The get_authenticated_mechanic_id() function references deleted mechanic_sessions table',
      impact: 'Mechanic dashboard cannot load - RLS policies fail',
      note: 'Cannot query system tables directly - use Supabase Dashboard to check',
    })

  } catch (error: any) {
    console.error('[fix-mechanic-auth GET] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
