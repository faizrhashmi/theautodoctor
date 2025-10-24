import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'

export interface MechanicAssignedEmailParams {
  customerEmail: string
  customerName: string
  mechanicName: string
  mechanicBio?: string
  sessionId: string
  estimatedStartTime?: string
}

export async function sendMechanicAssignedEmail(params: MechanicAssignedEmailParams) {
  const {
    customerEmail,
    customerName,
    mechanicName,
    mechanicBio,
    sessionId,
    estimatedStartTime,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const sessionUrl = `${appUrl}/sessions/${sessionId}`

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  Good news! A mechanic has been assigned to your diagnostic session and will be ready to help you shortly.
</p>

<div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; border: 2px solid #10b981;">
  <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
    👨‍🔧 Your Mechanic
  </p>
  <h2 style="margin: 0 0 12px 0; color: #047857; font-size: 24px; font-weight: 700;">
    ${mechanicName}
  </h2>
  ${mechanicBio ? `
  <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
    ${mechanicBio}
  </p>
  ` : ''}
</div>

${estimatedStartTime ? `
<div style="margin: 24px 0; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 6px;">
  <p style="margin: 0; color: #1e40af; font-size: 16px;">
    <strong>Estimated Start:</strong> ${estimatedStartTime}
  </p>
  <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 14px;">
    You'll receive a reminder before the session starts.
  </p>
</div>
` : `
<div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #92400e; font-size: 16px;">
    <strong>Status:</strong> Waiting for ${mechanicName} to start the session
  </p>
  <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">
    The session will begin shortly. You'll be notified when it starts.
  </p>
</div>
`}

<h3 style="margin: 32px 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
  Before your session
</h3>

<ul style="margin: 0; padding-left: 24px; color: #475569; line-height: 1.8;">
  <li>Make sure you're near your vehicle</li>
  <li>Have good lighting for clear video</li>
  <li>Test your camera and microphone</li>
  <li>Have any relevant paperwork or error codes ready</li>
</ul>

${emailButton('Join Session', sessionUrl, 'green')}

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
  If you have any questions or need to reschedule, please contact our support team.
</p>
  `

  await sendEmail({
    to: customerEmail,
    subject: `${mechanicName} is Ready to Help 👨‍🔧`,
    html: emailLayout(content),
  })
}
