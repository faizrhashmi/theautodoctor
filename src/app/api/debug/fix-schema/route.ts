import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function getHandler() {
  try {
    console.log('[fix-schema] Dropping old foreign key constraint...')

    // Drop the old foreign key constraint
    const { error: dropError } = await (supabaseAdmin as any).rpc('exec_sql', {
      sql: `
        ALTER TABLE public.session_requests
          DROP CONSTRAINT IF EXISTS session_requests_mechanic_id_fkey;
      `
    })

    if (dropError) {
      console.error('[fix-schema] Error dropping constraint:', dropError)
      // Try alternative method - direct SQL
      await supabaseAdmin
        .from('session_requests')
        .select('id')
        .limit(0)

      console.log('[fix-schema] Attempting manual fix - please run this SQL in Supabase Studio:')
      const sql = `
-- Fix session_requests.mechanic_id foreign key
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_mechanic_id_fkey;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_mechanic_id_fkey
  FOREIGN KEY (mechanic_id)
  REFERENCES public.mechanics(id)
  ON DELETE SET NULL;
`
      return NextResponse.json({
        success: false,
        message: 'Cannot run migrations via API. Please run the SQL manually.',
        sql: sql
      })
    }

    console.log('[fix-schema] Adding new foreign key constraint...')

    // Add new foreign key constraint
    const { error: addError } = await (supabaseAdmin as any).rpc('exec_sql', {
      sql: `
        ALTER TABLE public.session_requests
          ADD CONSTRAINT session_requests_mechanic_id_fkey
          FOREIGN KEY (mechanic_id)
          REFERENCES public.mechanics(id)
          ON DELETE SET NULL;
      `
    })

    if (addError) {
      console.error('[fix-schema] Error adding constraint:', addError)
      return NextResponse.json({
        success: false,
        error: addError.message
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Schema fixed successfully!'
    })
  } catch (error: any) {
    console.error('[fix-schema] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      sql: `
-- Run this SQL manually in Supabase Studio:
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_mechanic_id_fkey;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_mechanic_id_fkey
  FOREIGN KEY (mechanic_id)
  REFERENCES public.mechanics(id)
  ON DELETE SET NULL;
`
    })
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
