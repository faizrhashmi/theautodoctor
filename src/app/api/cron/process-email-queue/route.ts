import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Vercel Cron Job: Process Email Queue
 *
 * Runs every minute to process pending emails from the queue
 *
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-email-queue",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      console.error('[process-email-queue] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = Date.now()

    // Get pending emails (limit 10 per run to avoid timeouts)
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', supabaseAdmin.rpc('max_attempts')) // Only get emails that haven't exceeded max attempts
      .order('priority', { ascending: true }) // High priority first
      .order('scheduled_for', { ascending: true }) // Older first
      .limit(10)

    if (fetchError) {
      console.error('[process-email-queue] Error fetching emails:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No pending emails',
        duration: Date.now() - startTime,
      })
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each email
    for (const email of emails) {
      try {
        // Mark as sending
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'sending',
            attempts: email.attempts + 1,
          })
          .eq('id', email.id)

        // Send via Resend
        const { data: resendData, error: sendError } = await resend.emails.send({
          from: email.from_email,
          to: email.to_email,
          subject: email.subject,
          html: email.html_body,
          text: email.text_body,
        })

        if (sendError) {
          throw new Error(sendError.message)
        }

        // Mark as sent
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_id: resendData?.id || null,
          })
          .eq('id', email.id)

        results.sent++
        console.log(`[process-email-queue] Email sent: ${email.id} (${email.to_email})`)
      } catch (error: any) {
        // Check if max attempts reached
        const shouldMarkFailed = email.attempts + 1 >= email.max_attempts

        await supabaseAdmin
          .from('email_queue')
          .update({
            status: shouldMarkFailed ? 'failed' : 'pending',
            last_error: error?.message || 'Unknown error',
          })
          .eq('id', email.id)

        results.failed++
        results.errors.push(`${email.id}: ${error?.message}`)
        console.error(`[process-email-queue] Email failed: ${email.id}`, error)
      }

      results.processed++
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      ...results,
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[process-email-queue] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message,
      },
      { status: 500 }
    )
  }
}
