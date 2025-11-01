import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Test different session_requests queries to isolate the error
 */
async function getHandler() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  }

  try {
    // Test 1: Simple count query
    const { count, error: countError } = await supabaseAdmin
      .from('session_requests')
      .select('*', { count: 'exact', head: true })

    results.tests.push({
      test: 1,
      query: 'Count all session_requests',
      success: !countError,
      count,
      error: countError?.message
    })

    // Test 2: Select just ID
    const { data: idsOnly, error: idsError } = await supabaseAdmin
      .from('session_requests')
      .select('id')
      .limit(5)

    results.tests.push({
      test: 2,
      query: 'Select only ID column',
      success: !idsError,
      count: idsOnly?.length || 0,
      error: idsError?.message
    })

    // Test 3: Select specific columns
    const { data: specificCols, error: specificError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id, session_type, status, created_at')
      .limit(5)

    results.tests.push({
      test: 3,
      query: 'Select specific columns',
      success: !specificError,
      count: specificCols?.length || 0,
      error: specificError?.message
    })

    // Test 4: Select * with status filter
    const { data: withFilter, error: filterError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(5)

    results.tests.push({
      test: 4,
      query: 'Select * with status=pending filter',
      success: !filterError,
      count: withFilter?.length || 0,
      data: withFilter,
      error: filterError?.message
    })

    // Test 5: Direct SQL query
    const { data: rawQuery, error: rawError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: 'SELECT COUNT(*) as count FROM session_requests WHERE status = \'pending\';'
      })
      .catch(() => ({ data: null, error: { message: 'exec_sql not available' } }))

    results.tests.push({
      test: 5,
      query: 'Raw SQL via RPC',
      success: !rawError,
      data: rawQuery,
      error: rawError?.message
    })

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[test-session-requests-query] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      tests: results.tests,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
