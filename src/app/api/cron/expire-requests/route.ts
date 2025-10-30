import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { toSessionRequest } from '@/lib/sessionRequests'
import type { SessionRequestRow } from '@/lib/sessionRequests'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'

/**
 * CRON JOB: Expire Old Session Requests
 *
 * Purpose: Automatically expire pending session requests that have passed their timeout period
 *
 * This endpoint should be called periodically (recommended: every 1-5 minutes) by:
 * - Vercel Cron Jobs
 * - External cron service (e.g., cron-job.org)
 * - Supabase pg_cron extension
 *
 * Authentication:
 * - Verifies cron secret to prevent unauthorized access
 * - Set CRON_SECRET env variable for security
 *
 * Returns:
 * - Count of expired requests
 * - IDs of expired requests
 * - Notifications sent to customers
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Send notification to customer when their request expires
 */
async function sendExpiredRequestNotification(request: SessionRequestRow) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !request.customer_email) {
    console.log('[expire-requests] Skipping notification - no API key or customer email')
    return
  }

  try {
    const resend = new Resend(apiKey)
    const sessionLabel =
      request.plan_code === 'chat10'
        ? 'Quick Chat'
        : request.session_type === 'video'
        ? 'Video Session'
        : request.session_type === 'diagnostic'
        ? 'Diagnostic Session'
        : 'Session'

    await resend.emails.send({
      from: process.env.REQUEST_ALERT_FROM_EMAIL ?? 'Auto Doctor <notifications@theautodoctor.com>',
      to: request.customer_email,
      subject: `Your ${sessionLabel} request has expired`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Request Timeout</h2>

          <p>Hi ${request.customer_name || 'there'},</p>

          <p>Unfortunately, no mechanics were available to accept your <strong>${sessionLabel}</strong> request within the 15-minute window.</p>

          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>What this means:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Your request has been marked as expired</li>
              <li>No charges have been made to your account</li>
              <li>You can submit a new request anytime</li>
            </ul>
          </div>

          <p><strong>Next steps:</strong></p>
          <ul>
            <li>Try submitting a new request - mechanics may be available now</li>
            <li>Check back during business hours for better availability</li>
            <li>Contact support if you need immediate assistance</li>
          </ul>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="https://theautodoctor.com/customer/dashboard"
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Submit New Request
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            We apologize for the inconvenience. Our mechanics typically respond within minutes during business hours.
          </p>
        </div>
      `,
      text: `
Hi ${request.customer_name || 'there'},

Unfortunately, no mechanics were available to accept your ${sessionLabel} request within the 15-minute window.

What this means:
- Your request has been marked as expired
- No charges have been made to your account
- You can submit a new request anytime

Next steps:
- Try submitting a new request - mechanics may be available now
- Check back during business hours for better availability
- Contact support if you need immediate assistance

Visit your dashboard to submit a new request:
https://theautodoctor.com/customer/dashboard

We apologize for the inconvenience. Our mechanics typically respond within minutes during business hours.
      `.trim(),
    })

    console.log(`[expire-requests] Sent expiration notification to ${request.customer_email}`)
  } catch (error) {
    console.error('[expire-requests] Failed to send expiration notification:', error)
    // Don't throw - notification failure shouldn't break the cron job
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[expire-requests] Unauthorized cron attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.warn('[expire-requests] CRON_SECRET not set - cron endpoint is unprotected!')
    }

    console.log('[expire-requests] Starting expiration check...')

    // Call the database function to expire old requests
    const { data: result, error: functionError } = await supabaseAdmin.rpc('expire_old_session_requests')

    if (functionError) {
      console.error('[expire-requests] Database function error:', functionError)
      return NextResponse.json(
        {
          error: 'Database error while expiring requests',
          details: functionError.message,
        },
        { status: 500 }
      )
    }

    const expiredCount = result?.[0]?.expired_count ?? 0
    const expiredIds = result?.[0]?.expired_request_ids ?? []

    console.log(`[expire-requests] Expired ${expiredCount} requests`)

    if (expiredCount > 0 && expiredIds.length > 0) {
      // Fetch full request data for notifications
      const { data: expiredRequests } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .in('id', expiredIds)

      // Broadcast expiration events and send notifications
      if (expiredRequests && expiredRequests.length > 0) {
        for (const request of expiredRequests) {
          try {
            // Broadcast to real-time listeners
            await broadcastSessionRequest('request_cancelled', {
              request: toSessionRequest(request),
              reason: 'expired',
            })

            // Send customer notification email
            await sendExpiredRequestNotification(request)
          } catch (error) {
            console.warn('[expire-requests] Failed to process expiration for request', request.id, error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      expiredIds,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[expire-requests] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for manual testing
 * Can be called via browser or curl for debugging
 */
export async function GET(req: NextRequest) {
  try {
    // Check for test/debug authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json(
        {
          message: 'This is a cron endpoint. Use POST with Bearer token authentication.',
          setup: 'Set CRON_SECRET env variable and call POST with Authorization: Bearer <CRON_SECRET>',
        },
        { status: 401 }
      )
    }

    // Check for expired requests without updating them
    const { data: expiredRequests } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_name, created_at, expires_at')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())

    return NextResponse.json({
      message: 'Cron endpoint active. Use POST to expire requests.',
      expiredRequestsFound: expiredRequests?.length ?? 0,
      expiredRequests: expiredRequests ?? [],
    })
  } catch (error: any) {
    console.error('[expire-requests] GET error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
