import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'

export interface BookingConfirmedEmailParams {
  customerEmail: string
  customerName: string
  sessionId: string
  scheduledTime?: string
  issueDescription: string
  requestId: string
}

export async function sendBookingConfirmedEmail(params: BookingConfirmedEmailParams) {
  const {
    customerEmail,
    customerName,
    sessionId,
    scheduledTime,
    issueDescription,
    requestId,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dashboardUrl = `${appUrl}/customer/dashboard`

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  Great news! Your diagnostic session has been confirmed. A mechanic will be with you shortly to help diagnose your vehicle issue.
</p>

${emailInfoBox('Your Issue', issueDescription, 'blue')}

${scheduledTime ? `
<div style="margin: 24px 0; padding: 20px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px;">
  <p style="margin: 0; color: #065f46; font-size: 16px;">
    <strong>Scheduled Time:</strong> ${scheduledTime}
  </p>
</div>
` : `
<div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #92400e; font-size: 16px;">
    <strong>Status:</strong> Waiting for mechanic assignment
  </p>
  <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">
    You'll receive another email once a mechanic is assigned.
  </p>
</div>
`}

<h3 style="margin: 32px 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
  What happens next?
</h3>

<ol style="margin: 0; padding-left: 24px; color: #475569; line-height: 1.8;">
  <li>A mechanic will review your request and accept it</li>
  <li>You'll receive a notification when they're ready to start</li>
  <li>Join the video session to diagnose your vehicle together</li>
  <li>Get a detailed summary and next steps after the session</li>
</ol>

${emailButton('View Session Details', `${appUrl}/sessions/${sessionId}`, 'blue')}

<div style="margin: 32px 0 0 0; padding: 20px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
    Session Details
  </p>
  <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">
    <strong>Session ID:</strong> ${sessionId.slice(0, 8)}
  </p>
  <p style="margin: 0; font-size: 14px; color: #475569;">
    <strong>Request ID:</strong> ${requestId.slice(0, 8)}
  </p>
</div>

<p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
  If you have any questions or need to make changes, visit your dashboard or contact our support team.
</p>
  `

  await sendEmail({
    to: customerEmail,
    subject: 'Your Auto Diagnostic Session is Confirmed 🚗',
    html: emailLayout(content),
  })
}
