// @ts-nocheck
// src/app/api/admin/database/saved-queries/route.ts
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
    const category = searchParams.get('category') || undefined

    let query = supabase
      .from('admin_saved_queries')
      .select('*')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    console.error('Error fetching saved queries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved queries', message: error.message },
      { status: 500 }
    )
  }
}
