import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'

export interface SummaryDeliveredEmailParams {
  sessionId: string
  customerEmail: string
  customerName: string
  mechanicName: string
  summary: {
    findings: string
    steps_taken: string
    parts_needed: string
    next_steps: string
    photos: string[]
  }
}

export async function sendSummaryDeliveredEmail(params: SummaryDeliveredEmailParams) {
  const {
    sessionId,
    customerEmail,
    customerName,
    mechanicName,
    summary,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const summaryUrl = `${appUrl}/customer/dashboard`

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  <strong>${mechanicName}</strong> has completed the diagnostic summary for your session. Here's what was found:
</p>

${emailInfoBox('Diagnostic Findings', summary.findings, 'blue')}

${emailInfoBox('Steps Taken', summary.steps_taken, 'green')}

${summary.parts_needed ? emailInfoBox('Parts/Repairs Needed', summary.parts_needed, 'amber') : ''}

${emailInfoBox('Recommended Next Steps', summary.next_steps, 'purple')}

${summary.photos && summary.photos.length > 0 ? `
<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px;">
  <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
    📸 Photos (${summary.photos.length})
  </h3>
  <p style="margin: 0; color: #64748b; font-size: 14px;">
    ${summary.photos.length} photo${summary.photos.length > 1 ? 's' : ''} from your session ${summary.photos.length > 1 ? 'are' : 'is'} available in your dashboard
  </p>
</div>
` : ''}

${emailButton('View Full Summary', summaryUrl, 'blue')}

<div style="margin: 32px 0; padding: 24px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #10b981;">
  <h4 style="margin: 0 0 12px 0; color: #047857; font-size: 16px; font-weight: 600;">
    💡 What to Do Next
  </h4>
  <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
    <li>Review the full summary in your dashboard</li>
    <li>Follow the mechanic's recommendations</li>
    <li>Book a follow-up if you need clarification</li>
    <li>Keep this summary for your records</li>
  </ul>
</div>

<div style="margin: 32px 0; padding: 24px; background-color: #fef9c3; border-radius: 8px; border: 1px solid #fde047;">
  <h4 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px; font-weight: 600;">
    ❓ Have Questions?
  </h4>
  <p style="margin: 0 0 16px 0; color: #713f12; font-size: 14px; line-height: 1.6;">
    Need clarification on the findings or recommendations? Request a follow-up consultation from your dashboard.
  </p>
  <a href="${summaryUrl}"
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
  <p style="margin: 0; font-size: 14px; color: #475569;">
    <strong>Mechanic:</strong> ${mechanicName}
  </p>
</div>

<p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
  Thank you for choosing The Auto Doctor. We're here if you need anything else!
</p>
  `

  await sendEmail({
    to: customerEmail,
    subject: `Your Diagnostic Summary from ${mechanicName} 📋`,
    html: emailLayout(content),
  })
}
