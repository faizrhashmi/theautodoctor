import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

/**
 * GET /api/workshops/directory
 *
 * Returns active workshops with available mechanics for customer selection
 *
 * Query params:
 * - limit: Number of workshops to return (default: 20)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return bad('Supabase not configured on server', 500)
  }

  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log('[workshop-directory] Fetching workshops. Limit:', limit, 'Offset:', offset)

    // Use the database function we created in the migration
    const { data: workshops, error } = await supabaseAdmin.rpc('get_workshop_directory', {
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      console.error('[workshop-directory] Database error:', error)
      return bad(error.message, 500)
    }

    console.log('[workshop-directory] Found', workshops?.length || 0, 'workshops')

    return NextResponse.json({
      ok: true,
      workshops: workshops || [],
      total: workshops?.length || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('[workshop-directory] Error:', error)
    return bad(error.message || 'Failed to fetch workshop directory', 500)
  }
}
