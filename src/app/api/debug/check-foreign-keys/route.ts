import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT: Check foreign keys on session_requests table
 *
 * This will query the PostgreSQL system catalogs to see what foreign keys exist
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  }

  try {
    // Query PostgreSQL system catalogs for foreign keys on session_requests
    const { data: foreignKeys, error: fkError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'session_requests'
        ORDER BY tc.constraint_name;
      `
    }).catch(() => ({ data: null, error: { message: 'exec_sql not available' } }))

    if (fkError) {
      results.checks.push({
        check: 'Foreign Keys Query',
        error: fkError.message,
        note: 'exec_sql RPC not available, trying alternative method'
      })

      // Alternative: Direct query (may not work depending on permissions)
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'session_requests')
        .eq('constraint_type', 'FOREIGN KEY')

      results.checks.push({
        check: 'Alternative Foreign Keys Query',
        success: !tablesError,
        data: tables,
        error: tablesError?.message
      })
    } else {
      results.checks.push({
        check: 'Foreign Keys on session_requests',
        data: foreignKeys
      })
    }

    // Check if session_intakes table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'session_intakes')
      .maybeSingle()

    results.checks.push({
      check: 'Does session_intakes table exist?',
      exists: !!tableExists,
      error: tableError?.message
    })

    // List all tables that start with 'session'
    const { data: sessionTables, error: sessionTablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'session%')
      .order('table_name')

    results.checks.push({
      check: 'All tables starting with "session"',
      data: sessionTables?.map(t => t.table_name),
      error: sessionTablesError?.message
    })

    // Check columns on session_requests table
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'session_requests')
      .order('ordinal_position')

    results.checks.push({
      check: 'Columns on session_requests table',
      count: columns?.length || 0,
      data: columns,
      error: columnsError?.message
    })

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('[check-foreign-keys] Error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      checks: results.checks,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
