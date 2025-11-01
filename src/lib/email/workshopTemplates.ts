/**
 * Workshop Email Templates
 * Email notifications for workshop application status changes
 */

import { emailLayout, emailButton, emailInfoBox } from './emailService'

interface WorkshopApprovalEmailParams {
  workshopName: string
  contactName?: string
  dashboardUrl: string
  notes?: string
}

export function workshopApprovalEmail({
  workshopName,
  contactName,
  dashboardUrl,
  notes,
}: WorkshopApprovalEmailParams): { subject: string; html: string } {
  const greeting = contactName ? `Hi ${contactName}` : 'Hello'

  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  🎉 Congratulations! Your workshop has been approved
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  ${greeting},
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  We're excited to inform you that <strong>${workshopName}</strong> has been approved to join The Auto Doctor platform!
  Your workshop is now active and ready to start connecting with customers and mechanics.
</p>

${emailInfoBox(
  '🚀 What You Can Do Now',
  `• Access your workshop dashboard to manage settings\n• Invite mechanics to join your team\n• Review and customize your workshop profile\n• Start accepting service requests from customers in your area`
)}

${notes ? emailInfoBox('Admin Notes', notes, 'blue') : ''}

${emailButton('Go to Workshop Dashboard', dashboardUrl, 'green')}

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  <strong>Next Steps:</strong>
</p>

<ol style="margin: 12px 0 24px 0; color: #475569; font-size: 16px; line-height: 1.8; padding-left: 24px;">
  <li>Complete your workshop profile with photos and detailed information</li>
  <li>Set up your service areas and coverage zones</li>
  <li>Invite your mechanics to join the platform</li>
  <li>Configure your commission rates and payment settings</li>
</ol>

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>💡 Pro Tip:</strong> The more complete your workshop profile is, the more customers and mechanics will trust your business.
    Take a few minutes to add photos, certifications, and detailed service descriptions.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Welcome to The Auto Doctor family! We're here to support you every step of the way.
</p>

<p style="margin: 16px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Best regards,<br/>
  <strong>The Auto Doctor Team</strong>
</p>
  `

  return {
    subject: `🎉 ${workshopName} - Workshop Application Approved!`,
    html: emailLayout(content),
  }
}

interface WorkshopRejectionEmailParams {
  workshopName: string
  contactName?: string
  notes?: string
  supportEmail: string
}

export function workshopRejectionEmail({
  workshopName,
  contactName,
  notes,
  supportEmail,
}: WorkshopRejectionEmailParams): { subject: string; html: string } {
  const greeting = contactName ? `Hi ${contactName}` : 'Hello'

  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  Workshop Application Status Update
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  ${greeting},
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Thank you for your interest in joining The Auto Doctor platform with <strong>${workshopName}</strong>.
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  After careful review, we are unable to approve your workshop application at this time.
</p>

${
  notes
    ? emailInfoBox('Review Details', notes, 'amber')
    : emailInfoBox(
        'Common Reasons for Application Review',
        `• Incomplete business registration documentation\n• Service area not currently supported\n• Insufficient workshop capacity information\n• Missing required certifications or licenses`,
        'amber'
      )
}

<div style="margin: 32px 0; padding: 24px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
  <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
    What You Can Do
  </h3>
  <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
    If you believe this decision was made in error or if you would like to address the issues mentioned above,
    please don't hesitate to reach out to our support team. We're happy to discuss your application and
    explore possibilities for reapplication.
  </p>
</div>

<div style="text-align: center; margin: 32px 0;">
  <a href="mailto:${supportEmail}"
     style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    Contact Support
  </a>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  We appreciate your interest in The Auto Doctor and wish you the best with your business.
</p>

<p style="margin: 16px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Best regards,<br/>
  <strong>The Auto Doctor Team</strong>
</p>
  `

  return {
    subject: `${workshopName} - Workshop Application Update`,
    html: emailLayout(content),
  }
}

interface WorkshopSignupConfirmationParams {
  workshopName: string
  contactName?: string
  contactEmail: string
}

export function workshopSignupConfirmationEmail({
  workshopName,
  contactName,
  contactEmail,
}: WorkshopSignupConfirmationParams): { subject: string; html: string } {
  const greeting = contactName ? `Hi ${contactName}` : 'Hello'

  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  ✅ Application Received!
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  ${greeting},
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Thank you for submitting your workshop application for <strong>${workshopName}</strong> to The Auto Doctor platform!
</p>

${emailInfoBox(
  '📋 What Happens Next?',
  `Our team is reviewing your application. This typically takes 2-3 business days.\\n\\nYou'll receive an email notification once your application has been reviewed.`
)}

<div style="margin: 32px 0; padding: 24px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
  <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
    Application Details
  </h3>
  <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
    <strong>Workshop Name:</strong> ${workshopName}<br/>
    <strong>Contact Email:</strong> ${contactEmail}<br/>
    <strong>Submitted:</strong> ${new Date().toLocaleString('en-CA')}
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  In the meantime, make sure you have:
</p>

<ul style="margin: 12px 0 24px 0; color: #475569; font-size: 16px; line-height: 1.8; padding-left: 24px;">
  <li>Your business registration documentation ready</li>
  <li>Workshop photos and facility information</li>
  <li>List of certifications and licenses</li>
  <li>Mechanic team information (if applicable)</li>
</ul>

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>📧 Keep an eye on your inbox!</strong> We'll send you an email as soon as your application is reviewed.
    Make sure to check your spam folder just in case.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Thank you for choosing The Auto Doctor. We're excited about the possibility of working with you!
</p>

<p style="margin: 16px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Best regards,<br/>
  <strong>The Auto Doctor Team</strong>
</p>
  `

  return {
    subject: `Application Received - ${workshopName}`,
    html: emailLayout(content),
  }
}

interface MechanicInviteEmailParams {
  mechanicEmail: string
  workshopName: string
  inviteCode: string
  signupUrl: string
  expiresInDays: number
}

export function mechanicInviteEmail({
  mechanicEmail,
  workshopName,
  inviteCode,
  signupUrl,
  expiresInDays,
}: MechanicInviteEmailParams): { subject: string; html: string } {
  const content = `
<h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700;">
  🔧 You're Invited to Join The Auto Doctor!
</h2>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Hello,
</p>

<p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Great news! <strong>${workshopName}</strong> has invited you to join their team on The Auto Doctor platform.
</p>

${emailInfoBox(
  '🚀 What is The Auto Doctor?',
  `The Auto Doctor is a revolutionary platform connecting skilled mechanics with customers who need automotive expertise.
As a mechanic with ${workshopName}, you'll be able to:\n\n• Conduct virtual diagnostic sessions\n• Earn income from video consultations\n• Help customers solve their car problems remotely\n• Build your professional reputation`
)}

<div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; text-align: center;">
  <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
    Your Invite Code
  </p>
  <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 28px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">
    ${inviteCode}
  </p>
  <p style="margin: 0; color: #64748b; font-size: 12px;">
    This code expires in ${expiresInDays} days
  </p>
</div>

${emailButton('Accept Invitation & Sign Up', signupUrl, 'green')}

<div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
    <strong>⚠️ Important:</strong> This invitation is specifically for you to join ${workshopName}.
    Please do not share this invite code with others.
  </p>
</div>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  <strong>What happens after you sign up?</strong>
</p>

<ol style="margin: 12px 0 24px 0; color: #475569; font-size: 16px; line-height: 1.8; padding-left: 24px;">
  <li>Complete your mechanic profile with your certifications and experience</li>
  <li>Get verified by our team (usually within 24-48 hours)</li>
  <li>Start accepting session requests and earning income</li>
  <li>Enjoy the flexibility of working on your own schedule</li>
</ol>

<p style="margin: 24px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  We're excited to have you join our growing community of automotive professionals!
</p>

<p style="margin: 16px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
  Best regards,<br/>
  <strong>The Auto Doctor Team</strong>
</p>
  `

  return {
    subject: `${workshopName} invited you to join The Auto Doctor`,
    html: emailLayout(content),
  }
}
