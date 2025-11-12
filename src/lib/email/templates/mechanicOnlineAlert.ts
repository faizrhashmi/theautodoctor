import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'

export interface MechanicOnlineAlertEmailParams {
  customerEmail: string
  customerName: string
  mechanicCount: number
}

export async function sendMechanicOnlineAlertEmail(params: MechanicOnlineAlertEmailParams) {
  const { customerEmail, customerName, mechanicCount } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const pluralMechanics = mechanicCount === 1 ? 'mechanic is' : 'mechanics are'
  const pluralThey = mechanicCount === 1 ? 'they' : 'one of them'

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  Great news! <strong>${mechanicCount} ${pluralMechanics}</strong> now online and ready to help with your vehicle issue.
</p>

${emailInfoBox(
  'Act Fast!',
  `
  <p style="margin: 0;">You have <strong>15 minutes</strong> to start your session before ${pluralThey} might become busy with other customers.</p>
  `,
  'amber'
)}

<p style="margin: 24px 0; font-size: 16px; color: #475569;">
  Click the button below to view available mechanics and start your diagnostic session now.
</p>

${emailButton('Start Session Now', `${appUrl}/customer/book-session`)}

<p style="margin: 32px 0 0 0; font-size: 14px; color: #94a3b8;">
  <strong>Prefer to schedule?</strong> You can also <a href="${appUrl}/customer/schedule" style="color: #3b82f6; text-decoration: underline;">schedule a session</a> for a specific time that works better for you.
</p>
`

  const html = emailLayout('Mechanic Available Now! 🚗', content)

  return sendEmail({
    to: customerEmail,
    subject: '🚗 Mechanic Online Now - Start Your Session | AskAutoDoctor',
    html,
  })
}
