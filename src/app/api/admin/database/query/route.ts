// @ts-nocheck
// src/app/api/admin/database/query/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/adminLogger'
import { requireAdminAPI } from '@/lib/auth/guards'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Whitelist of allowed SQL commands (read-only operations)
const ALLOWED_COMMANDS = [
  'SELECT',
  'SHOW',
  'DESCRIBE',
  'EXPLAIN',
  'WITH' // For CTEs with SELECT
]

function isQuerySafe(query: string): { safe: boolean; reason?: string } {
  const trimmedQuery = query.trim().toUpperCase()

  // Check if query starts with an allowed command
  const startsWithAllowed = ALLOWED_COMMANDS.some(cmd => trimmedQuery.startsWith(cmd))

  if (!startsWithAllowed) {
    return {
      safe: false,
      reason: 'Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH queries are allowed'
    }
  }

  // Block dangerous keywords even in SELECT queries
  const dangerousKeywords = [
    'DROP',
    'DELETE',
    'UPDATE',
    'INSERT',
    'ALTER',
    'CREATE',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'EXECUTE'
  ]

  for (const keyword of dangerousKeywords) {
    if (trimmedQuery.includes(keyword)) {
      return {
        safe: false,
        reason: `Dangerous keyword '${keyword}' detected`
      }
    }
  }

  return { safe: true }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data
    console.log(`[ADMIN] ${admin.email} accessing SQL query execution`)
    console.warn(
      `[SECURITY] DANGEROUS: Admin ${admin.email} executing SQL query`
    )

    const body = await request.json()
    const { query, save, name, description, category } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Validate query safety
    const safetyCheck = isQuerySafe(query)
    if (!safetyCheck.safe) {
      await logger.warn('database', 'Unsafe query blocked', {
        query: query.substring(0, 200),
        reason: safetyCheck.reason,
      })

      return NextResponse.json(
        { error: safetyCheck.reason },
        { status: 403 }
      )
    }

    // Execute query using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: query })

    const executionTime = Date.now() - startTime

    if (error) {
      // Log failed query
      await supabase.from('admin_query_history').insert({
        query,
        execution_time_ms: executionTime,
        rows_returned: 0,
        success: false,
        error_message: error.message,
      })

      await logger.error('database', 'Query execution failed', {
        query: query.substring(0, 200),
        error: error.message,
        executionTime,
      })

      return NextResponse.json(
        { error: 'Query execution failed', message: error.message },
        { status: 500 }
      )
    }

    // Log successful query
    await supabase.from('admin_query_history').insert({
      query,
      execution_time_ms: executionTime,
      rows_returned: Array.isArray(data) ? data.length : 1,
      success: true,
    })

    await logger.info('database', 'Query executed successfully', {
      query: query.substring(0, 200),
      executionTime,
      rowsReturned: Array.isArray(data) ? data.length : 1,
    })

    // Save query if requested
    if (save && name) {
      await supabase.from('admin_saved_queries').insert({
        name,
        description,
        query,
        category: category || 'custom',
      })
    }

    return NextResponse.json({
      data,
      executionTime,
      rowCount: Array.isArray(data) ? data.length : 1,
    })
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime

    await logger.error('database', 'Query execution error', {
      error: error.message,
      executionTime,
    })

    return NextResponse.json(
      { error: 'Query execution error', message: error.message },
      { status: 500 }
    )
  }
}

// Note: The exec_sql RPC function needs to be created in Supabase
// This is a safer alternative to direct SQL execution
// For now, we'll use a simpler approach with Supabase queries
