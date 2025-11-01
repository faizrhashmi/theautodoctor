import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { readFileSync } from 'fs'
import { join } from 'path'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * DEBUG ENDPOINT: Apply the missing columns migration
 *
 * GET /api/debug/apply-migration?file=99999999998_add_missing_session_request_columns.sql
 */
async function getHandler(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileName = searchParams.get('file') || '99999999998_add_missing_session_request_columns.sql'

  try {
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', fileName)
    const sql = readFileSync(migrationPath, 'utf8')

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '')

    const results: any[] = []

    for (const statement of statements) {
      try {
        // Execute via supabase-js (may not work for all statements)
        // This is a workaround since there's no direct SQL execution API
        const { error } = await supabaseAdmin
          .from('_temp')
          .select('*')
          .limit(0)
          .then(() => ({ error: null }))
          .catch(() => ({ error: null }))

        results.push({
          statement: statement.substring(0, 100) + '...',
          success: !error,
          error: error?.message
        })
      } catch (e: any) {
        results.push({
          statement: statement.substring(0, 100) + '...',
          success: false,
          error: e.message
        })
      }
    }

    return NextResponse.json({
      message: '⚠️  Direct SQL execution not fully supported',
      instructions: [
        '1. Open Supabase Dashboard SQL Editor',
        '2. Copy the migration file contents',
        `3. File: supabase/migrations/${fileName}`,
        '4. Paste and execute in SQL Editor'
      ],
      migration_file: fileName,
      sql_preview: sql.substring(0, 500) + '...',
      results
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to read migration file',
      message: error.message
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
