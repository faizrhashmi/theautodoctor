import { sendEmail, emailLayout, emailButton, emailInfoBox } from '../emailService'
import type { IdentifiedIssue } from '@/types/sessionSummary'

/**
 * Phase 3.1: Enhanced Summary Email
 * Sent automatically after session summary is generated
 * Uses auto-generated summary data structure
 */

export interface SummaryDeliveredEmailParams {
  sessionId: string
  customerEmail: string
  customerName: string
  mechanicName: string
  summary: {
    customer_report?: string | null
    identified_issues?: IdentifiedIssue[]
    media_file_ids?: string[]
    session_type?: string
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
  const summaryUrl = `${appUrl}/sessions/${sessionId}/summary`
  const rfqUrl = `${appUrl}/customer/rfq/create?session_id=${sessionId}`
  const dashboardUrl = `${appUrl}/customer/dashboard`

  const hasIssues = summary.identified_issues && summary.identified_issues.length > 0
  const hasMedia = summary.media_file_ids && summary.media_file_ids.length > 0
  const issueCount = summary.identified_issues?.length || 0

  // Build issues summary for email
  let issuesHtml = ''
  if (hasIssues) {
    const urgentIssues = summary.identified_issues!.filter(i => i.severity === 'urgent').length
    const highIssues = summary.identified_issues!.filter(i => i.severity === 'high').length

    issuesHtml = `
<div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b;">
  <h3 style="margin: 0 0 16px 0; color: #92400e; font-size: 20px; font-weight: 700;">
    🔍 Issues Identified: ${issueCount}
  </h3>
  ${urgentIssues > 0 ? `
  <div style="margin: 0 0 12px 0; padding: 12px; background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 4px;">
    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
      ⚠️ ${urgentIssues} Urgent Issue${urgentIssues > 1 ? 's' : ''} Requiring Immediate Attention
    </p>
  </div>
  ` : ''}
  ${highIssues > 0 ? `
  <div style="margin: 0 0 12px 0; padding: 12px; background-color: rgba(249, 115, 22, 0.1); border-left: 4px solid #f97316; border-radius: 4px;">
    <p style="margin: 0; color: #9a3412; font-size: 14px; font-weight: 600;">
      ⚡ ${highIssues} High-Priority Issue${highIssues > 1 ? 's' : ''} Found
    </p>
  </div>
  ` : ''}
  <div style="margin: 16px 0 0 0;">
    <p style="margin: 0 0 8px 0; color: #78350f; font-size: 14px;">
      <strong>Top Issues:</strong>
    </p>
    <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
      ${summary.identified_issues!.slice(0, 3).map(issue => `
        <li style="margin-bottom: 4px;">
          ${issue.issue}${issue.est_cost_range ? ` <span style="color: #047857; font-weight: 600;">(~${issue.est_cost_range})</span>` : ''}
        </li>
      `).join('')}
    </ol>
    ${issueCount > 3 ? `
    <p style="margin: 12px 0 0 0; color: #a16207; font-size: 13px; font-style: italic;">
      +${issueCount - 3} more issue${issueCount - 3 > 1 ? 's' : ''} in full summary
    </p>
    ` : ''}
  </div>
</div>
    `
  }

  const content = `
<p style="margin: 0 0 24px 0; font-size: 16px; color: #1e293b;">
  Hi <strong>${customerName}</strong>,
</p>

<p style="margin: 0 0 24px 0; font-size: 16px; color: #475569;">
  <strong>${mechanicName}</strong> has completed the diagnostic summary for your ${summary.session_type || 'session'}. ${hasIssues ? `We found ${issueCount} issue${issueCount > 1 ? 's' : ''} that need${issueCount === 1 ? 's' : ''} your attention.` : 'Here are the findings:'}
</p>

<div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; border: 2px solid #10b981; text-align: center;">
  <p style="margin: 0 0 8px 0; font-size: 32px;">
    ✓
  </p>
  <h2 style="margin: 0 0 8px 0; color: #047857; font-size: 24px; font-weight: 700;">
    Diagnostic Complete
  </h2>
  <p style="margin: 0; color: #065f46; font-size: 16px;">
    Your vehicle analysis is ready
  </p>
</div>

${summary.customer_report ? emailInfoBox('Mechanic Report', summary.customer_report, 'blue') : ''}

${issuesHtml}

${hasMedia ? `
<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px;">
  <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
    📸 Session Media (${summary.media_file_ids!.length})
  </h3>
  <p style="margin: 0; color: #64748b; font-size: 14px;">
    ${summary.media_file_ids!.length} photo${summary.media_file_ids!.length > 1 ? 's or video' : ''} from your session ${summary.media_file_ids!.length > 1 ? 'are' : 'is'} available in your summary
  </p>
</div>
` : ''}

${emailButton('View Full Summary', summaryUrl, 'blue')}

${hasIssues ? `
<div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%); border-radius: 8px; border: 2px solid #a855f7;">
  <h4 style="margin: 0 0 12px 0; color: #581c87; font-size: 18px; font-weight: 700; text-align: center;">
    🔧 Ready to Get Your Vehicle Fixed?
  </h4>
  <p style="margin: 0 0 16px 0; color: #6b21a8; font-size: 15px; line-height: 1.6; text-align: center;">
    Request quotes from trusted local workshops. Get competitive bids and choose the best option for your repairs!
  </p>
  <div style="text-align: center;">
    <a href="${rfqUrl}"
       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(168, 85, 247, 0.3);">
      Request Workshop Quotes →
    </a>
  </div>
  <p style="margin: 16px 0 0 0; color: #7c3aed; font-size: 13px; text-align: center;">
    ✓ Free quotes &nbsp; • &nbsp; ✓ Local workshops &nbsp; • &nbsp; ✓ No commitment
  </p>
</div>
` : ''}

<div style="margin: 32px 0; padding: 24px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #10b981;">
  <h4 style="margin: 0 0 12px 0; color: #047857; font-size: 16px; font-weight: 600;">
    💡 What to Do Next
  </h4>
  <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
    <li>Review the full summary and findings</li>
    ${hasIssues ? '<li><strong>Request quotes from workshops</strong> for repairs</li>' : ''}
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
