/**
 * RFQ Auto-Expiration Cron Job
 *
 * Expires RFQs that have passed their bid_deadline
 * Should be called by a cron service (Vercel Cron, etc.) every hour
 *
 * @route GET /api/cron/rfq-expiration
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireFeature } from '@/lib/flags'
import { notifyRfqExpiringSoon } from '@/lib/rfq/notifications'

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    // Create admin Supabase client (server-side, bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Step 1: Find RFQs expiring in 24 hours (send warning)
    const { data: expiringRfqs } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, customer_id, title, bid_count, bid_deadline')
      .eq('status', 'open')
      .gte('bid_deadline', now.toISOString())
      .lte('bid_deadline', twentyFourHoursFromNow.toISOString())

    // Send expiration warnings
    if (expiringRfqs && expiringRfqs.length > 0) {
      console.log(`[Cron] Sending expiration warnings for ${expiringRfqs.length} RFQs`)

      const notificationPromises = expiringRfqs.map(rfq => {
        const deadline = new Date(rfq.bid_deadline)
        const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))

        return notifyRfqExpiringSoon({
          customerId: rfq.customer_id,
          rfqId: rfq.id,
          rfqTitle: rfq.title,
          bidCount: rfq.bid_count,
          hoursRemaining: Math.max(1, hoursRemaining)
        })
      })

      await Promise.allSettled(notificationPromises)
    }

    // Step 2: Call database function to expire old RFQs
    const { data: expireResult } = await supabase
      .rpc('auto_expire_rfq_marketplace')

    const expiredCount = expireResult || 0

    console.log(`[Cron] Expired ${expiredCount} RFQs`)

    // Step 3: Find RFQs that expired with no bids (for analytics)
    const { data: expiredNoBids } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, title')
      .eq('status', 'expired')
      .eq('bid_count', 0)
      .gte('updated_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      warnings_sent: expiringRfqs?.length || 0,
      expired_no_bids: expiredNoBids?.length || 0,
      timestamp: now.toISOString()
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ expiration cron error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ marketplace feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
