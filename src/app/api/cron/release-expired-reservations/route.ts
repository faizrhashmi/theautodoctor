/**
 * CRON JOB: Release Expired Reservations
 *
 * Runs every 5 minutes to clean up expired slot reservations.
 *
 * When a customer reserves a time slot during checkout but doesn't
 * complete payment within 15 minutes, the reservation expires and
 * becomes available for other customers.
 *
 * Schedule in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/release-expired-reservations",
 *     "schedule": "*\/5 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { reservationService } from '@/lib/scheduling/reservationService'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON] Unauthorized cron job attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Running expired reservations cleanup...')

    const releasedCount = await reservationService.releaseExpiredReservations()

    console.log(`[CRON] ✓ Released ${releasedCount} expired reservations`)

    return NextResponse.json({
      success: true,
      released_count: releasedCount,
      timestamp: new Date().toISOString(),
      message: `Released ${releasedCount} expired reservations`
    })

  } catch (error) {
    console.error('[CRON] Error releasing expired reservations:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
