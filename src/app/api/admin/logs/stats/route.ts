// @ts-nocheck
// src/app/api/admin/logs/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { logger } from '@/lib/adminLogger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')

    const stats = await logger.getErrorStats(hours)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching log stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch log stats', message: error.message },
      { status: 500 }
    )
  }
}
