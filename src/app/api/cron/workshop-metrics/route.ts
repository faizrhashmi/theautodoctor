// @ts-nocheck
/**
 * Workshop Metrics Aggregation Cron Job
 * Runs daily to calculate and store workshop metrics
 *
 * Schedule: Daily at 1 AM UTC
 * URL: /api/cron/workshop-metrics
 *
 * Can be triggered manually or via cron service (Vercel, Supabase, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { calculateDailyMetrics, calculateWeeklyMetrics } from '@/lib/analytics/workshopMetrics'

// Optional: Add authentication for cron endpoints
function verifyCronSecret(req: NextRequest): boolean {
  // If you're using Vercel Cron, check for their authorization header
  const authHeader = headers().get('authorization')

  // If using a custom cron secret
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const providedSecret = req.headers.get('x-cron-secret')
    return providedSecret === cronSecret
  }

  // For development, allow all requests
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // In production, require some form of auth
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  try {
    // Optional: Verify cron authentication
    // if (!verifyCronSecret(req)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const typeParam = searchParams.get('type') || 'daily'

    // Allow specifying a date for backfilling or testing
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    console.log(`[CRON] Running workshop metrics aggregation for ${targetDate.toDateString()}`)

    const startTime = Date.now()
    let result

    if (typeParam === 'weekly') {
      // Calculate weekly metrics (runs on Mondays)
      result = await calculateWeeklyMetrics(targetDate)
    } else {
      // Calculate daily metrics (default)
      result = await calculateDailyMetrics(targetDate)
    }

    const duration = Date.now() - startTime

    if (!result.success) {
      console.error('[CRON] Metrics calculation failed:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          duration,
        },
        { status: 500 }
      )
    }

    // On Sunday, also calculate weekly metrics
    if (targetDate.getDay() === 0 && typeParam === 'daily') {
      const weeklyResult = await calculateWeeklyMetrics(targetDate)
      console.log('[CRON] Weekly metrics calculation:', weeklyResult.success ? 'success' : 'failed')
    }

    console.log(`[CRON] Metrics aggregation completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `${typeParam} metrics calculated successfully`,
      metricsId: result.metricsId,
      date: targetDate.toISOString().split('T')[0],
      duration,
    })
  } catch (error: any) {
    console.error('[CRON] Unexpected error in metrics cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// POST endpoint for manual trigger with specific parameters
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { startDate, endDate, backfill } = body

    if (backfill && startDate && endDate) {
      // Backfill metrics for a date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      const results = []

      console.log(`[CRON] Backfilling metrics from ${startDate} to ${endDate}`)

      const current = new Date(start)
      while (current <= end) {
        const result = await calculateDailyMetrics(new Date(current))
        results.push({
          date: current.toISOString().split('T')[0],
          success: result.success,
          error: result.error,
        })
        current.setDate(current.getDate() + 1)
      }

      return NextResponse.json({
        success: true,
        message: `Backfilled ${results.length} days of metrics`,
        results,
      })
    }

    // Single date calculation
    const targetDate = startDate ? new Date(startDate) : new Date()
    const result = await calculateDailyMetrics(targetDate)

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Metrics calculated successfully' : 'Metrics calculation failed',
      metricsId: result.metricsId,
      error: result.error,
      date: targetDate.toISOString().split('T')[0],
    })
  } catch (error: any) {
    console.error('[CRON] Error in manual metrics trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}