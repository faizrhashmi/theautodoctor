/**
 * Customer Email Templates
 * Email notifications for customers
 */

import { emailLayout, emailButton, emailInfoBox } from './emailService'

interface QuoteNotificationEmailParams {
  customerName: string
  workshopName: string
  quoteTotalPrice: number
  quoteCurrency: string
  quoteViewUrl: string
  issueDescription: string
}

export function quoteNotificationEmail({
  customerName,
  workshopName,
  quoteTotalPrice,
  quoteCurrency,
  quoteViewUrl,
  issueDescription,
}: QuoteNotificationEmailParams): { subject: string; html: string } {
  const formattedPrice = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: quoteCurrency || 'CAD',
  }).format(quoteTotalPrice)

  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  📋 Your Quote is Ready!
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Hi ${customerName},
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Great news! <strong>${workshopName}</strong> has prepared a quote for your vehicle service request.
</p>

${emailInfoBox(
  '🚗 Service Request',
  issueDescription
)}

<div style="margin: 32px 0; padding: 24px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; text-align: center;">
  <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
    Estimated Total
  </p>
  <p style="margin: 0; color: #1e293b; font-size: 36px; font-weight: 700;">
    ${formattedPrice}
  </p>
  <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px;">
    Final price may vary based on actual work required
  </p>
</div>

${emailButton('View Full Quote Details', quoteViewUrl, 'blue')}

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  <strong>What's Next?</strong>
</p>

<ol style="margin: 12px 0 24px 0; color: #475569; font-size: 16px; line-height: 1.8; padding-left: 24px;">
  <li>Review the detailed quote breakdown</li>
  <li>Accept the quote to schedule your service</li>
  <li>Or message ${workshopName} if you have any questions</li>
</ol>

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>💡 Pro Tip:</strong> This quote is valid for 7 days. If you have any concerns about the pricing or need clarification on any services, don't hesitate to reach out to the workshop directly.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  We're here to help you get back on the road safely!
</p>

<p style="margin: 16px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Best regards,<br/>
  <strong>The Auto Doctor Team</strong>
</p>
  `

  return {
    subject: `Quote Ready from ${workshopName} - ${formattedPrice}`,
    html: emailLayout(content),
  }
}
