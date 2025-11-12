import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'

export interface WaitlistJoinedEmailParams {
  customerEmail: string
  customerName: string
}

export async function sendWaitlistJoinedEmail(params: WaitlistJoinedEmailParams) {
  const { customerEmail, customerName } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  You've been added to the waitlist! We'll notify you as soon as a mechanic comes online.
</p>

${emailInfoBox(
  'What happens next?',
  `
  <ul style="margin: 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">We'll send you an email the moment a mechanic comes online</li>
    <li style="margin-bottom: 8px;">You'll have 15 minutes to start your session</li>
    <li style="margin-bottom: 8px;">Alternatively, you can schedule a session for a specific time</li>
  </ul>
  `,
  'blue'
)}

<p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
  <strong>Tip:</strong> Mechanics are typically most active during business hours (9 AM - 6 PM EST). If you don't want to wait, you can schedule a session for a time that works best for you.
</p>

${emailButton('Schedule a Session', `${appUrl}/customer/schedule`)}

<p style="margin: 32px 0 0 0; font-size: 14px; color: #94a3b8;">
  You'll remain on the waitlist for 24 hours. After that, you'll need to re-join if you still need assistance.
</p>
`

  const html = emailLayout('You are on the Waitlist!', content)

  return sendEmail({
    to: customerEmail,
    subject: 'You are on the Waitlist - AskAutoDoctor',
    html,
  })
}
