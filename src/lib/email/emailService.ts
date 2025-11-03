/**
 * Email Service
 * Centralized email sending using Resend API
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return null
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'AskAutoDoctor <noreply@askautodoctor.com>',
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${errorText}`)
    }

    const result = await response.json()
    console.log(`[Email] Email sent: ${result.id} to ${to}`)
    return result
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    throw error
  }
}

/**
 * Base email layout wrapper
 */
export function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AskAutoDoctor</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🚗 AskAutoDoctor
              </h1>
              <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px;">
                Your Virtual Mechanic
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-align: center;">
                Need help? Contact us at
                <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@askautodoctor.com'}" style="color: #3b82f6; text-decoration: none;">
                  ${process.env.SUPPORT_EMAIL || 'support@askautodoctor.com'}
                </a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                © ${new Date().getFullYear()} AskAutoDoctor. All rights reserved.
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
}

/**
 * Button component for emails
 */
export function emailButton(text: string, url: string, color: 'blue' | 'green' = 'blue'): string {
  const colors = {
    blue: 'background-color: #3b82f6;',
    green: 'background-color: #10b981;',
  }

  return `
<div style="text-align: center; margin: 32px 0;">
  <a href="${url}"
     style="display: inline-block; padding: 14px 32px; ${colors[color]} color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    ${text}
  </a>
</div>
  `
}

/**
 * Info box component for emails
 */
export function emailInfoBox(title: string, content: string, color: 'blue' | 'green' | 'amber' | 'purple' = 'blue'): string {
  const borderColors = {
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    purple: '#8b5cf6',
  }

  return `
<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid ${borderColors[color]}; border-radius: 6px;">
  <h2 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
    ${title}
  </h2>
  <p style="margin: 0; color: #475569; white-space: pre-wrap; line-height: 1.6;">
    ${content}
  </p>
</div>
  `
}
