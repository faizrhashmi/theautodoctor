// @ts-nocheck
// src/app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogLevel, LogSource } from '@/lib/adminLogger'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: NextRequest) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(request)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const searchParams = request.nextUrl.searchParams

    // Parse filters from query params
    const levelParam = searchParams.get('level')
    const sourceParam = searchParams.get('source')
    const search = searchParams.get('search') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Parse multi-value filters
    const level = levelParam ? levelParam.split(',') as LogLevel[] : undefined
    const source = sourceParam ? sourceParam.split(',') as LogSource[] : undefined

    const result = await logger.getLogs({
      level,
      source,
      search,
      startDate,
      endDate,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(request)
  if (!auth.authorized) {
    return auth.response!
  }

  console.warn(
    `[ADMIN ACTION] ${auth.profile?.full_name} deleting logs`
  )

  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')

    // This would delete logs older than specified days
    // For now, we'll just return success
    // You can implement actual deletion logic if needed

    return NextResponse.json({
      success: true,
      message: `Logs older than ${days} days would be deleted`,
    })
  } catch (error: any) {
    console.error('Error deleting logs:', error)
    return NextResponse.json(
      { error: 'Failed to delete logs', message: error.message },
      { status: 500 }
    )
  }
}
