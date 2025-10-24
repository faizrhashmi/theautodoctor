import { sendEmail, emailLayout, emailButton } from '../emailService'

export interface SessionEndedEmailParams {
  customerEmail: string
  customerName: string
  mechanicName: string
  sessionId: string
  duration: string
  hasSummary: boolean
}

export async function sendSessionEndedEmail(params: SessionEndedEmailParams) {
  const {
    customerEmail,
    customerName,
    mechanicName,
    sessionId,
    duration,
    hasSummary,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dashboardUrl = `${appUrl}/customer/dashboard`
  const summaryUrl = `${appUrl}/sessions/${sessionId}/summary`

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  Your diagnostic session with <strong>${mechanicName}</strong> has ended. Thank you for using The Auto Doctor!
</p>

<div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; border: 2px solid #10b981; text-align: center;">
  <p style="margin: 0 0 8px 0; font-size: 32px;">
    ✓
  </p>
  <h2 style="margin: 0 0 8px 0; color: #047857; font-size: 24px; font-weight: 700;">
    Session Complete
  </h2>
  <p style="margin: 0; color: #065f46; font-size: 16px;">
    Duration: ${duration}
  </p>
</div>

${hasSummary ? `
<div style="margin: 24px 0; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 6px;">
  <p style="margin: 0; color: #1e40af; font-size: 16px;">
    <strong>${mechanicName}</strong> has prepared a detailed summary of your session with findings and recommendations.
  </p>
</div>

${emailButton('View Session Summary', summaryUrl, 'blue')}
` : `
<div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #92400e; font-size: 16px;">
    <strong>${mechanicName}</strong> is preparing a detailed summary of your session. You'll receive an email once it's ready.
  </p>
</div>

${emailButton('View Session Details', dashboardUrl, 'blue')}
`}

<h3 style="margin: 32px 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
  What's Next?
</h3>

<ol style="margin: 0 0 24px 0; padding-left: 24px; color: #475569; line-height: 1.8;">
  <li>Review the diagnostic findings in your summary</li>
  <li>Follow the recommended next steps</li>
  <li>Book a follow-up session if needed</li>
  <li>Share your feedback to help us improve</li>
</ol>

<div style="margin: 32px 0; padding: 24px; background-color: #fef9c3; border-radius: 8px; border: 1px solid #fde047;">
  <h4 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">
    📋 Have a follow-up question?
  </h4>
  <p style="margin: 0 0 16px 0; color: #713f12; font-size: 14px; line-height: 1.6;">
    If you have additional questions about your diagnosis, you can request a quick follow-up consultation from your dashboard.
  </p>
  <a href="${dashboardUrl}"
     style="display: inline-block; padding: 10px 20px; background-color: #eab308; color: #422006; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
    Ask a Follow-up Question →
  </a>
</div>

<div style="margin: 32px 0 0 0; padding: 20px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
    Session Details
  </p>
  <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">
    <strong>Session ID:</strong> ${sessionId.slice(0, 8)}
  </p>
  <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">
    <strong>Mechanic:</strong> ${mechanicName}
  </p>
  <p style="margin: 0; font-size: 14px; color: #475569;">
    <strong>Duration:</strong> ${duration}
  </p>
</div>

<p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
  Thank you for choosing The Auto Doctor. We hope your vehicle issues are resolved soon!
</p>
  `

  await sendEmail({
    to: customerEmail,
    subject: 'Your Diagnostic Session is Complete ✓',
    html: emailLayout(content),
  })
}
