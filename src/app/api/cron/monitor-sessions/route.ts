import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logInfo } from '@/lib/log'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      nudged_mechanics: 0,
      support_alerts: 0,
      auto_ended_sessions: 0,
      errors: [] as string[],
    }

    const now = new Date()

    // Task 8.1: Nudge mechanic if accepted but not live after 3 minutes
    try {
      const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000)

      const { data: acceptedSessions } = await supabaseAdmin
        .from('sessions')
        .select('id, mechanic_id, mechanic:mechanic_id(email, full_name), created_at')
        .eq('status', 'accepted')
        .lt('created_at', threeMinutesAgo.toISOString())

      const sessionsToNudge =
        (acceptedSessions ?? []) as Array<{
          id: string
          mechanic_id: string | null
          created_at: string
          mechanic?: { email?: string | null; full_name?: string | null } | null
        }>

      if (sessionsToNudge.length > 0) {
        for (const session of sessionsToNudge) {
          try {
            const mechanicInfo = session.mechanic ?? null
            const minutesWaiting = Math.floor(
              (now.getTime() - new Date(session.created_at).getTime()) / 60000
            )

            // Send nudge email to mechanic
            await sendNudgeEmail({
              sessionId: session.id,
              mechanicEmail: mechanicInfo?.email ?? '',
              mechanicName: mechanicInfo?.full_name ?? 'Mechanic',
              minutesWaiting,
            })

            await logInfo(
              'session.mechanic_nudged',
              `Nudged mechanic for session ${session.id}`,
              {
                sessionId: session.id,
                mechanicId: session.mechanic_id ?? undefined,
                metadata: { minutesWaiting },
              }
            )

            results.nudged_mechanics++
          } catch (err: any) {
            results.errors.push(`Failed to nudge mechanic for ${session.id}: ${err.message}`)
          }
        }
      }
    } catch (err: any) {
      results.errors.push(`Mechanic nudge check failed: ${err.message}`)
    }

    // Task 8.2: Alert support if both present but status != 'live' for 2 minutes
    try {
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

      const { data: waitingSessions } = await supabaseAdmin
        .from('sessions')
        .select('id, status, mechanic_id, customer_user_id, created_at')
        .in('status', ['waiting', 'accepted'])
        .lt('created_at', twoMinutesAgo.toISOString())

      if (waitingSessions && waitingSessions.length > 0) {
        for (const session of waitingSessions) {
          try {
            const minutesStuck = Math.floor(
              (now.getTime() - new Date(session.created_at).getTime()) / 60000
            )

            // Send support alert
            await sendSupportAlert({
              sessionId: session.id,
              status: session.status,
              minutesStuck,
            })

            await logInfo(
              'session.support_alert',
              `Support alerted for stuck session ${session.id}`,
              {
                sessionId: session.id,
                metadata: {
                  status: session.status,
                  minutesStuck,
                },
              }
            )

            results.support_alerts++
          } catch (err: any) {
            results.errors.push(`Failed to alert support for ${session.id}: ${err.message}`)
          }
        }
      }
    } catch (err: any) {
      results.errors.push(`Support alert check failed: ${err.message}`)
    }

    // Task 8.3: Auto-end sessions running longer than 3 hours
    try {
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)

      const { data: longRunningSessions } = await supabaseAdmin
        .from('sessions')
        .select('id, status, started_at, mechanic_id, customer_user_id')
        .in('status', ['live', 'reconnecting'])
        .lt('started_at', threeHoursAgo.toISOString())

      if (longRunningSessions && longRunningSessions.length > 0) {
        for (const session of longRunningSessions) {
          try {
            // Auto-end the session
            const { error } = await supabaseAdmin
              .from('sessions')
              .update({
                status: 'completed',
                ended_at: now.toISOString(),
                metadata: {
                  auto_ended: true,
                  auto_ended_reason: 'session_exceeded_3_hours',
                  auto_ended_at: now.toISOString(),
                },
              })
              .eq('id', session.id)

            if (error) throw error

            // Broadcast session:ended event
            await supabaseAdmin.channel(`session:${session.id}`).send({
              type: 'broadcast',
              event: 'session:ended',
              payload: {
                sessionId: session.id,
                status: 'completed',
                ended_at: now.toISOString(),
                reason: 'auto_ended_max_duration',
              },
            })

            await logInfo(
              'session.auto_ended',
              `Auto-ended session ${session.id} after 3 hours`,
              {
                sessionId: session.id,
                metadata: {
                  originalStatus: session.status,
                  startedAt: session.started_at,
                },
              }
            )

            results.auto_ended_sessions++
          } catch (err: any) {
            results.errors.push(`Failed to auto-end session ${session.id}: ${err.message}`)
          }
        }
      }
    } catch (err: any) {
      results.errors.push(`Auto-end check failed: ${err.message}`)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('[Cron Monitor] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper: Send nudge email to mechanic
async function sendNudgeEmail({
  sessionId,
  mechanicEmail,
  mechanicName,
  minutesWaiting,
}: {
  sessionId: string
  mechanicEmail: string
  mechanicName: string
  minutesWaiting: number
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping nudge email')
    return
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⏰ Session Waiting</h1>
  </div>

  <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${mechanicName},</p>
    <p>A customer has been waiting for <strong>${minutesWaiting} minutes</strong> for their diagnostic session to start.</p>

    <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      <p style="margin: 0;"><strong>Session ID:</strong> ${sessionId.slice(0, 8)}</p>
      <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Accepted</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/mechanic/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Start Session Now
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      Please start the session as soon as possible to provide excellent customer service.
    </p>
  </div>
</body>
</html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'The Auto Doctor <noreply@theautodoctor.com>',
      to: mechanicEmail,
      subject: `⏰ Customer Waiting - Session ${sessionId.slice(0, 8)}`,
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend API error: ${await response.text()}`)
  }

  return response.json()
}

// Helper: Send support alert
async function sendSupportAlert({
  sessionId,
  status,
  minutesStuck,
}: {
  sessionId: string
  status: string
  minutesStuck: number
}) {
  if (!process.env.SUPPORT_EMAIL || !process.env.RESEND_API_KEY) {
    console.warn('SUPPORT_EMAIL or RESEND_API_KEY not configured, skipping support alert')
    return
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🚨 Support Alert: Stuck Session</h1>
  </div>

  <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>A session has been stuck for <strong>${minutesStuck} minutes</strong>.</p>

    <div style="margin: 20px 0; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0;"><strong>Session ID:</strong> ${sessionId}</p>
      <p style="margin: 10px 0 0 0;"><strong>Status:</strong> ${status}</p>
      <p style="margin: 10px 0 0 0;"><strong>Minutes Stuck:</strong> ${minutesStuck}</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/sessions"
         style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
        View Session in Admin
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      Please investigate and take action if necessary.
    </p>
  </div>
</body>
</html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'The Auto Doctor <noreply@theautodoctor.com>',
      to: process.env.SUPPORT_EMAIL,
      subject: `🚨 Stuck Session Alert - ${sessionId.slice(0, 8)}`,
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend API error: ${await response.text()}`)
  }

  return response.json()
}
