// @ts-nocheck
// src/app/api/admin/logs/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/adminLogger'

export async function GET(request: NextRequest) {
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
