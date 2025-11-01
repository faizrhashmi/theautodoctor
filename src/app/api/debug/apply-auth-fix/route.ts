import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Apply auth function fix
 *
 * This applies the migration to fix the ambiguous column error in get_authenticated_mechanic_id()
 */
async function getHandler() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    // Step 1: Drop function with CASCADE
    const dropSql = `DROP FUNCTION IF EXISTS get_authenticated_mechanic_id() CASCADE;`

    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: dropSql
    }).catch(() => ({ error: null }))

    if (dropError) {
      // Try without RPC
      console.log('[apply-auth-fix] Cannot use exec_sql RPC, using alternative')
    }

    results.steps.push({
      step: 1,
      action: 'Drop function with CASCADE',
      sql: dropSql,
      status: 'Note: This may require manual execution in SQL Editor'
    })

    // Step 2: Create fixed function
    const createFunctionSql = `
CREATE OR REPLACE FUNCTION get_authenticated_mechanic_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  mech_id UUID;
  authenticated_user_id UUID;
BEGIN
  authenticated_user_id := auth.uid();

  IF authenticated_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO mech_id
  FROM public.mechanics
  WHERE user_id = authenticated_user_id
  AND can_accept_sessions = true
  LIMIT 1;

  RETURN mech_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_authenticated_mechanic_id() TO anon;
`

    results.steps.push({
      step: 2,
      action: 'Create fixed function',
      status: 'SQL prepared'
    })

    return NextResponse.json({
      ...results,
      success: false,
      message: '⚠️  This migration requires manual execution',
      instructions: [
        '1. Open Supabase Dashboard → SQL Editor (http://127.0.0.1:54323/project/default/sql)',
        '2. Copy and paste the SQL below',
        '3. Execute the migration',
        '',
        '--- START SQL ---',
        '',
        dropSql,
        '',
        createFunctionSql,
        '',
        '-- Recreate policies (see full migration file for policy SQL)',
        '',
        '--- END SQL ---',
        '',
        'Or run the full migration file:',
        'File: supabase/migrations/99999999999_safe_fix_auth_function.sql'
      ]
    })

  } catch (error: any) {
    console.error('[apply-auth-fix] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      steps: results.steps,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
