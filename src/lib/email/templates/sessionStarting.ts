import { sendEmail, emailLayout, emailButton } from '../emailService'

export interface SessionStartingEmailParams {
  customerEmail: string
  customerName: string
  mechanicName: string
  sessionId: string
  startTime: string
  minutesUntilStart: number
}

export async function sendSessionStartingEmail(params: SessionStartingEmailParams) {
  const {
    customerEmail,
    customerName,
    mechanicName,
    sessionId,
    startTime,
    minutesUntilStart,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const sessionUrl = `${appUrl}/sessions/${sessionId}`

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<div style="margin: 0 0 32px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b; text-align: center;">
  <p style="margin: 0 0 8px 0; font-size: 32px;">
    ⏰
  </p>
  <h2 style="margin: 0 0 8px 0; color: #92400e; font-size: 24px; font-weight: 700;">
    Your Session Starts in ${minutesUntilStart} Minutes!
  </h2>
  <p style="margin: 0; color: #78350f; font-size: 16px;">
    ${mechanicName} is ready to help diagnose your vehicle
  </p>
</div>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  Your diagnostic session with <strong>${mechanicName}</strong> is about to begin. Please make sure you're ready to join.
</p>

<div style="margin: 24px 0; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 6px;">
  <p style="margin: 0; color: #1e40af; font-size: 16px;">
    <strong>Start Time:</strong> ${startTime}
  </p>
</div>

<h3 style="margin: 32px 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
  Quick Checklist
</h3>

<div style="margin: 0 0 24px 0;">
  <div style="margin: 0 0 12px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">
    <p style="margin: 0; color: #1e293b; font-size: 15px;">
      ✓ Near your vehicle
    </p>
  </div>
  <div style="margin: 0 0 12px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">
    <p style="margin: 0; color: #1e293b; font-size: 15px;">
      ✓ Good lighting for video
    </p>
  </div>
  <div style="margin: 0 0 12px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">
    <p style="margin: 0; color: #1e293b; font-size: 15px;">
      ✓ Camera and microphone tested
    </p>
  </div>
  <div style="margin: 0 0 12px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">
    <p style="margin: 0; color: #1e293b; font-size: 15px;">
      ✓ Relevant paperwork or error codes handy
    </p>
  </div>
</div>

${emailButton('Join Session Now', sessionUrl, 'green')}

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
    <strong>Start Time:</strong> ${startTime}
  </p>
</div>

<p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
  Can't make it? Contact our support team to reschedule.
</p>
  `

  await sendEmail({
    to: customerEmail,
    subject: `⏰ Your Session Starts in ${minutesUntilStart} Minutes`,
    html: emailLayout(content),
  })
}
