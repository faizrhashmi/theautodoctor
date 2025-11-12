/**
 * No-Show Notification Email Service
 * Sends notifications when a scheduled session is cancelled due to customer no-show
 */

interface NoShowNotificationParams {
  customerEmail: string
  customerName: string
  mechanicEmail: string
  mechanicName: string
  sessionId: string
  scheduledFor: Date
  mechanicCompensation: number
  customerCredit: number
}

export async function sendNoShowNotification(params: NoShowNotificationParams): Promise<void> {
  const {
    customerEmail,
    customerName,
    mechanicEmail,
    mechanicName,
    sessionId,
    scheduledFor,
    mechanicCompensation,
    customerCredit
  } = params

  await Promise.all([
    sendCustomerNoShowEmail(customerEmail, customerName, sessionId, scheduledFor, customerCredit),
    sendMechanicCompensationEmail(mechanicEmail, mechanicName, customerName, sessionId, scheduledFor, mechanicCompensation)
  ])
}

/**
 * Send email to customer about no-show cancellation
 */
async function sendCustomerNoShowEmail(
  to: string,
  customerName: string,
  sessionId: string,
  scheduledFor: Date,
  creditAmount: number
): Promise<void> {
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

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Cancelled - No-Show</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Session Cancelled - No-Show</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${customerName}</strong>,
                    </p>

                    <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                      Unfortunately, your scheduled session has been cancelled because the session waiver was not signed within 10 minutes of the scheduled start time.
                    </p>

                    <!-- Session Details Card -->
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                      <p style="margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cancelled Session</p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Date:</strong> ${formattedDate}
                      </p>
                      <p style="margin: 0; color: #475569; font-size: 15px;">
                        <strong>Time:</strong> ${formattedTime}
                      </p>
                    </div>

                    <!-- Refund Policy -->
                    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                      <p style="margin: 0 0 15px; color: #0f172a; font-size: 16px; font-weight: 600;">No-Show Policy Applied</p>
                      <p style="margin: 0 0 15px; color: #475569; font-size: 15px; line-height: 1.6;">
                        As per our cancellation policy, when a customer doesn't sign the required waiver:
                      </p>
                      <ul style="margin: 0 0 15px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                        <li><strong>50% of payment</strong> compensates the mechanic for their reserved time</li>
                        <li><strong>50% of payment</strong> has been credited to your account</li>
                      </ul>
                      <div style="background-color: #10b981; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0; font-size: 18px; font-weight: 700;">$${creditAmount.toFixed(2)} Account Credit</p>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Valid for 90 days</p>
                      </div>
                    </div>

                    <!-- Rebook CTA -->
                    <div style="text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 15px; color: #475569; font-size: 15px;">Ready to try again?</p>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/schedule" style="display: inline-block; padding: 16px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 6px rgba(249,115,22,0.3);">
                        Schedule a New Session
                      </a>
                    </div>

                    <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      Questions about this cancellation? Contact us at <a href="mailto:support@theautodoctor.com" style="color: #f97316; text-decoration: none;">support@theautodoctor.com</a>
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

  console.log('[NoShowNotification] Sending customer email to:', to)

  // For development: Write to file
  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs')
    const path = require('path')
    const emailDir = path.join(process.cwd(), 'tmp', 'emails')

    try {
      fs.mkdirSync(emailDir, { recursive: true })
      fs.writeFileSync(
        path.join(emailDir, `no-show-customer-${sessionId}-${Date.now()}.html`),
        emailHtml
      )
      console.log('[NoShowNotification] ✅ Customer email saved to tmp/emails/')
    } catch (err) {
      console.error('[NoShowNotification] Failed to save customer email:', err)
    }
  }
}

/**
 * Send email to mechanic about compensation
 */
async function sendMechanicCompensationEmail(
  to: string,
  mechanicName: string,
  customerName: string,
  sessionId: string,
  scheduledFor: Date,
  compensationAmount: number
): Promise<void> {
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

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Customer No-Show - Compensation Applied</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Customer No-Show - You've Been Compensated</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${mechanicName}</strong>,
                    </p>

                    <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                      A scheduled session with <strong>${customerName}</strong> has been automatically cancelled due to a customer no-show (waiver not signed). We value your time, so compensation has been applied to your account.
                    </p>

                    <!-- Session Details Card -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid #f97316; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                      <p style="margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cancelled Session</p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Customer:</strong> ${customerName}
                      </p>
                      <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                        <strong>Date:</strong> ${formattedDate}
                      </p>
                      <p style="margin: 0; color: #475569; font-size: 15px;">
                        <strong>Time:</strong> ${formattedTime}
                      </p>
                    </div>

                    <!-- Compensation Info -->
                    <div style="background-color: #10b981; color: #ffffff; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
                      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Compensation Amount</p>
                      <p style="margin: 0; font-size: 36px; font-weight: 700;">$${compensationAmount.toFixed(2)}</p>
                      <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">50% of session payment</p>
                    </div>

                    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px;">
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        <strong>💰 Payment Details:</strong> This compensation will be included in your next payout according to our standard payout schedule. You can view this earning in your dashboard under "Earnings."
                      </p>
                    </div>

                    <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                      Questions? Contact us at <a href="mailto:support@theautodoctor.com" style="color: #f97316; text-decoration: none;">support@theautodoctor.com</a>
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

  console.log('[NoShowNotification] Sending mechanic email to:', to)

  // For development: Write to file
  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs')
    const path = require('path')
    const emailDir = path.join(process.cwd(), 'tmp', 'emails')

    try {
      fs.mkdirSync(emailDir, { recursive: true })
      fs.writeFileSync(
        path.join(emailDir, `no-show-mechanic-${sessionId}-${Date.now()}.html`),
        emailHtml
      )
      console.log('[NoShowNotification] ✅ Mechanic email saved to tmp/emails/')
    } catch (err) {
      console.error('[NoShowNotification] Failed to save mechanic email:', err)
    }
  }
}
