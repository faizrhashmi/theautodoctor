import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * DEBUG ENDPOINT - Check actual database schema
 * GET /api/debug/check-schema
 */
export async function GET() {
  try {
    const results: any = {}

    // Check session_requests table structure
    const { data: sessionRequestsColumns, error: srError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'session_requests'
          ORDER BY ordinal_position;
        `
      })
      .single()

    if (srError) {
      // Try alternative method
      const { data: sample } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .limit(1)
        .maybeSingle()

      results.session_requests = {
        method: 'sample_query',
        columns: sample ? Object.keys(sample) : [],
        sample_data: sample
      }
    } else {
      results.session_requests = {
        method: 'information_schema',
        columns: sessionRequestsColumns
      }
    }

    // Check enum values
    const { data: enumValues, error: enumError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT e.enumlabel
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'session_request_status'
          ORDER BY e.enumsortorder;
        `
      })
      .single()

    if (enumError) {
      results.enum_check = {
        error: 'Could not query enum',
        details: enumError.message
      }
    } else {
      results.enum_values = enumValues
    }

    // Check foreign keys
    const { data: foreignKeys, error: fkError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            a.attname AS column_name,
            confrelid::regclass AS foreign_table,
            af.attname AS foreign_column
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
          JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
          WHERE conrelid::regclass::text = 'session_requests'
            AND contype = 'f';
        `
      })
      .single()

    if (fkError) {
      results.foreign_keys = {
        error: 'Could not query foreign keys',
        details: fkError.message
      }
    } else {
      results.foreign_keys = foreignKeys
    }

    // Get a sample session_request if any exist
    const { data: sampleRequest, error: sampleError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .limit(1)
      .maybeSingle()

    results.sample_request = sampleRequest || { error: sampleError?.message || 'No requests found' }

    // Check if we can insert with metadata
    const testInsert = {
      customer_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
      session_type: 'chat',
      plan_code: 'test',
      status: 'pending',
      customer_name: 'Test',
      customer_email: 'test@test.com'
    }

    // Try without metadata first
    const { error: insertError1 } = await supabaseAdmin
      .from('session_requests')
      .insert(testInsert)
      .select()

    results.can_insert_without_metadata = !insertError1
    results.insert_error_without_metadata = insertError1?.message || null

    // Try with metadata
    const { error: insertError2 } = await supabaseAdmin
      .from('session_requests')
      .insert({
        ...testInsert,
        metadata: { test: true }
      })
      .select()

    results.can_insert_with_metadata = !insertError2
    results.insert_error_with_metadata = insertError2?.message || null

    // Cleanup test inserts
    await supabaseAdmin
      .from('session_requests')
      .delete()
      .eq('customer_id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
