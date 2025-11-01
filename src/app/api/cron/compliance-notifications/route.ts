import { NextRequest, NextResponse } from 'next/server'
import {
  sendBatchInsuranceExpiryAlerts,
  sendBatchDataAccessReminders,
} from '@/lib/notifications/compliance-notifications'

/**
 * Compliance Notifications Cron Job
 *
 * This endpoint should be called periodically (e.g., daily) to send:
 * - Insurance expiry alerts to workshops
 * - Data access request reminders to admin
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/compliance-notifications",
 *     "schedule": "0 9 * * *"  // Run daily at 9 AM
 *   }]
 * }
 *
 * Or use GitHub Actions:
 * - name: Daily Compliance Notifications
 *   schedule:
 *     - cron: '0 9 * * *'
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting compliance notifications job...')

    // Send insurance expiry alerts
    const insuranceResults = await sendBatchInsuranceExpiryAlerts()
    console.log('[Cron] Insurance alerts:', insuranceResults)

    // Send data access reminders
    const dataAccessResults = await sendBatchDataAccessReminders()
    console.log('[Cron] Data access reminders:', dataAccessResults)

    const totalSent = insuranceResults.sent + dataAccessResults.sent
    const totalFailed = insuranceResults.failed + dataAccessResults.failed

    return NextResponse.json({
      success: true,
      message: 'Compliance notifications job completed',
      results: {
        insurance_alerts: insuranceResults,
        data_access_reminders: dataAccessResults,
        total: {
          sent: totalSent,
          failed: totalFailed,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Compliance notifications error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run compliance notifications job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggering
export async function POST(req: NextRequest) {
  return GET(req)
}
