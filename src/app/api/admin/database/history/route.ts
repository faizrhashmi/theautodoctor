// @ts-nocheck
// src/app/api/admin/database/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data, error } = await supabase
      .from('admin_query_history')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    console.error('Error fetching query history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch query history', message: error.message },
      { status: 500 }
    )
  }
}
