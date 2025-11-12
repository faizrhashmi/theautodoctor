/**
 * Waiver Reminder Email Service
 * Sends email to customer 15 minutes before scheduled session
 */

interface WaiverReminderParams {
  to: string
  customerName: string
  mechanicName: string
  sessionId: string
  scheduledFor: Date
  sessionType: string
}

export async function sendWaiverReminderEmail(params: WaiverReminderParams): Promise<void> {
  const { to, customerName, mechanicName, sessionId, scheduledFor, sessionType } = params

  const waiverUrl = `${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${sessionId}/waiver`

  const formattedDate = scheduledFor.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = scheduledFor.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const serviceTypeText = sessionType === 'video' ? 'Online Video Session' : 'In-Person Workshop Visit'

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Session Starts in 15 Minutes</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">⏰ Your Session Starts Soon!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${customerName}</strong>,
                    </p>

                    <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                      Your scheduled session with <strong>${mechanicName}</strong> starts in <strong>15 minutes</strong>. Before you can join, please sign the session waiver.
                    </p>

                    <!-- Session Details Card -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid #f97316; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                      <p style="margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Session Details</p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Type:</strong> ${serviceTypeText}
                      </p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Mechanic:</strong> ${mechanicName}
                      </p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Date:</strong> ${formattedDate}
                      </p>
                      <p style="margin: 0; color: #475569; font-size: 15px;">
                        <strong>Time:</strong> ${formattedTime}
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${waiverUrl}" style="display: inline-block; padding: 16px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 6px rgba(249,115,22,0.3);">
                        Sign Waiver & Join Session
                      </a>
                    </div>

                    <!-- Important Notice -->
                    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin-top: 30px;">
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> You must sign the waiver before joining the session. If the waiver is not signed within 10 minutes of the scheduled start time, the session will be cancelled and our no-show policy will apply (50% refund as account credit, 50% compensation to mechanic).
                      </p>
                    </div>

                    <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      Need help? Contact us at <a href="mailto:support@theautodoctor.com" style="color: #f97316; text-decoration: none;">support@theautodoctor.com</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} TheAutoDoctor. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const emailText = `
Your Session Starts in 15 Minutes!

Hi ${customerName},

Your scheduled session with ${mechanicName} starts in 15 minutes. Before you can join, please sign the session waiver.

Session Details:
- Type: ${serviceTypeText}
- Mechanic: ${mechanicName}
- Date: ${formattedDate}
- Time: ${formattedTime}

Sign the waiver here: ${waiverUrl}

IMPORTANT: You must sign the waiver before joining the session. If the waiver is not signed within 10 minutes of the scheduled start time, the session will be cancelled and our no-show policy will apply (50% refund as account credit, 50% compensation to mechanic).

Need help? Contact us at support@theautodoctor.com

© ${new Date().getFullYear()} TheAutoDoctor. All rights reserved.
  `

  // TODO: Replace with your email service (SendGrid, Resend, AWS SES, etc.)
  // For now, we'll use a placeholder that logs to console
  console.log('[WaiverReminder] Sending email to:', to)
  console.log('[WaiverReminder] Subject: Your Session Starts in 15 Minutes - Sign Waiver Required')

  // Example with Resend (install: pnpm add resend)
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'TheAutoDoctor <noreply@theautodoctor.com>',
  //   to: [to],
  //   subject: 'Your Session Starts in 15 Minutes - Sign Waiver Required',
  //   html: emailHtml,
  //   text: emailText
  // })

  // For development: Write to file
  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs')
    const path = require('path')
    const emailDir = path.join(process.cwd(), 'tmp', 'emails')

    try {
      fs.mkdirSync(emailDir, { recursive: true })
      fs.writeFileSync(
        path.join(emailDir, `waiver-reminder-${sessionId}-${Date.now()}.html`),
        emailHtml
      )
      console.log('[WaiverReminder] ✅ Email saved to tmp/emails/')
    } catch (err) {
      console.error('[WaiverReminder] Failed to save email:', err)
    }
  }
}
