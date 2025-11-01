/**
 * Internal Email Templates
 * Notifications for admin team and service advisors
 */

import { emailLayout, emailButton, emailInfoBox } from './emailService'

interface AdminWorkshopSignupNotificationParams {
  workshopName: string
  contactName: string
  contactEmail: string
  phone: string
  city: string
  province: string
  reviewUrl: string
}

export function adminWorkshopSignupNotification({
  workshopName,
  contactName,
  contactEmail,
  phone,
  city,
  province,
  reviewUrl,
}: AdminWorkshopSignupNotificationParams): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  🆕 New Workshop Application
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  A new workshop has submitted an application and requires admin review.
</p>

<div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px;">
  <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
    Workshop Details
  </h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Workshop Name:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${workshopName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Contact Person:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${contactName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Email:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${contactEmail}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Phone:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${phone}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Location:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${city}, ${province}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Submitted:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${new Date().toLocaleString('en-CA')}</td>
    </tr>
  </table>
</div>

${emailButton('Review Application', reviewUrl, 'blue')}

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>⏰ Action Required:</strong> Please review this application within 2-3 business days to maintain our service quality promise.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  <strong>Review Checklist:</strong>
</p>

<ul style="margin: 12px 0 24px 0; color: #475569; font-size: 14px; line-height: 1.8; padding-left: 24px;">
  <li>Verify business registration information</li>
  <li>Check service coverage areas</li>
  <li>Review workshop capacity and certifications</li>
  <li>Validate contact information</li>
</ul>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">
  <em>This is an automated notification from The Auto Doctor admin system.</em>
</p>
  `

  return {
    subject: `[Admin] New Workshop Application: ${workshopName}`,
    html: emailLayout(content),
  }
}

interface ServiceAdvisorQuoteReminderParams {
  workshopName: string
  mechanicName: string
  sessionId: string
  customerName: string
  diagnosis: string
  dashboardUrl: string
}

export function serviceAdvisorQuoteReminder({
  workshopName,
  mechanicName,
  sessionId,
  customerName,
  diagnosis,
  dashboardUrl,
}: ServiceAdvisorQuoteReminderParams): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  📋 Quote Creation Required
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  A diagnostic session has been completed and requires a service quote.
</p>

${emailInfoBox(
  '🔧 Diagnosis Summary',
  diagnosis || 'Diagnostic report completed by mechanic.'
)}

<div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px;">
  <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
    Session Details
  </h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Workshop:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${workshopName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Mechanic:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${mechanicName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Customer:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${customerName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Session ID:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-family: monospace;">${sessionId}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Completed:</td>
      <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${new Date().toLocaleString('en-CA')}</td>
    </tr>
  </table>
</div>

${emailButton('Create Quote', dashboardUrl, 'green')}

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>⚡ Action Required:</strong> Please create and send a quote to the customer as soon as possible to maintain service quality.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">
  <em>This is an automated notification from The Auto Doctor workshop system.</em>
</p>
  `

  return {
    subject: `[${workshopName}] Quote Required for Session ${sessionId.substring(0, 8)}`,
    html: emailLayout(content),
  }
}
