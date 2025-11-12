/**
 * GET /api/cron/check-scheduled-sessions
 *
 * Cron endpoint that runs every minute to:
 * 1. Send waiver reminders for sessions starting in 15 minutes
 * 2. Process no-shows (waiver not signed 10 min after scheduled time)
 *
 * Security: Vercel Cron Secret or internal authorization required
 *
 * Setup:
 * - Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/check-scheduled-sessions",
 *       "schedule": "* * * * *"
 *     }]
 *   }
 * - Or use external cron service (cron-job.org, EasyCron, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { scheduledSessionChecker } from '@/lib/scheduledSessionChecker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max execution time

export async function GET(request: NextRequest) {
  try {
    // 1. Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[cron] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[cron] 🔄 Starting scheduled session checks...')

    // 2. Run all checks
    const startTime = Date.now()
    const results = await scheduledSessionChecker.runAllChecks()
    const duration = Date.now() - startTime

    console.log(`[cron] ✅ Completed in ${duration}ms`)

    // 3. Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      results: {
        waiver_reminders_sent: results.remindersSent,
        no_shows_processed: results.noShowsProcessed
      }
    })

  } catch (error: any) {
    console.error('[cron] ❌ Error running scheduled checks:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
