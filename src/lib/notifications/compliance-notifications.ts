/**
 * Compliance Notification Utilities
 *
 * Handles sending compliance-related notifications for:
 * - Insurance expiry alerts
 * - Data access request reminders
 * - Consent update notifications
 * - Breach notifications
 *
 * NOTE: This is a template implementation. In production, you would:
 * 1. Integrate with email service (SendGrid, AWS SES, etc.)
 * 2. Use proper email templates
 * 3. Add retry logic and queue management
 * 4. Track delivery status
 */

import { createClient } from '@/lib/supabase/server'

interface InsuranceExpiryNotification {
  organizationId: string
  organizationName: string
  contactEmail: string
  expiryDate: string
  daysUntilExpiry: number
  alertLevel: 'critical' | 'urgent' | 'warning'
}

interface DataAccessReminderNotification {
  customerId: string
  customerEmail: string
  customerName: string
  requestedAt: string
  daysPending: number
}

interface ConsentUpdateNotification {
  customerId: string
  customerEmail: string
  customerName: string
  consentType: string
  currentVersion: string
  newVersion: string
}

/**
 * Send insurance expiry alert to workshop
 */
export async function sendInsuranceExpiryAlert(
  notification: InsuranceExpiryNotification
): Promise<boolean> {
  try {
    console.log('[Notification] Insurance Expiry Alert:', {
      to: notification.contactEmail,
      workshop: notification.organizationName,
      expiryDate: notification.expiryDate,
      daysRemaining: notification.daysUntilExpiry,
    })

    // TODO: Integrate with email service
    // Example with SendGrid:
    // await sendEmail({
    //   to: notification.contactEmail,
    //   subject: `URGENT: Insurance Expiring in ${notification.daysUntilExpiry} Days`,
    //   template: 'insurance-expiry-alert',
    //   data: notification,
    // })

    // For now, log to console
    const subject =
      notification.alertLevel === 'critical'
        ? `🚨 CRITICAL: Insurance Expires in ${notification.daysUntilExpiry} Days`
        : notification.alertLevel === 'urgent'
        ? `⚠️ URGENT: Insurance Expires in ${notification.daysUntilExpiry} Days`
        : `⏰ Reminder: Insurance Expires in ${notification.daysUntilExpiry} Days`

    console.log(`
Email Template:
To: ${notification.contactEmail}
Subject: ${subject}

Dear ${notification.organizationName},

This is a ${notification.alertLevel} reminder that your workshop insurance will expire on ${new Date(notification.expiryDate).toLocaleDateString('en-CA')}.

Days remaining: ${notification.daysUntilExpiry}

${
      notification.alertLevel === 'critical'
        ? 'IMMEDIATE ACTION REQUIRED: Your insurance will expire in less than 7 days. You must renew immediately to continue receiving jobs through TheAutoDoctor.'
        : notification.alertLevel === 'urgent'
        ? 'URGENT: Please renew your insurance within the next 14 days to avoid service interruption.'
        : 'Please ensure your insurance is renewed before the expiry date to maintain your active status.'
    }

To update your insurance:
1. Log in to your TheAutoDoctor dashboard
2. Go to Profile > Insurance Information
3. Upload your renewed insurance certificate

If you have already renewed, please upload your new certificate as soon as possible.

Best regards,
TheAutoDoctor Compliance Team
    `)

    return true
  } catch (error) {
    console.error('Error sending insurance expiry alert:', error)
    return false
  }
}

/**
 * Send data access request reminder to admin
 */
export async function sendDataAccessReminder(
  notification: DataAccessReminderNotification
): Promise<boolean> {
  try {
    console.log('[Notification] Data Access Reminder:', {
      customer: notification.customerEmail,
      daysPending: notification.daysPending,
      requestedAt: notification.requestedAt,
    })

    // TODO: Send to admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@theautodoctor.ca'

    console.log(`
Email Template:
To: ${adminEmail}
Subject: ⚠️ PIPEDA Compliance Alert: Data Access Request Pending ${notification.daysPending} Days

Admin Alert,

A data access request from ${notification.customerName} (${notification.customerEmail}) has been pending for ${notification.daysPending} days.

Requested: ${new Date(notification.requestedAt).toLocaleString('en-CA')}
Days Pending: ${notification.daysPending}
PIPEDA Deadline: 30 days

${
      notification.daysPending > 30
        ? '🚨 OVERDUE: This request exceeds PIPEDA 30-day requirement!'
        : notification.daysPending > 25
        ? '⚠️ URGENT: Less than 5 days remaining to comply with PIPEDA'
        : '⏰ Action required soon'
    }

Action Required:
1. Log in to Admin Dashboard
2. Navigate to Privacy > Data Access
3. Generate data download for this customer
4. System will automatically send download link to customer

Failure to respond within 30 days may result in Privacy Commissioner complaints.

View Request: ${process.env.NEXT_PUBLIC_BASE_URL}/admin/privacy/data-access

TheAutoDoctor Compliance System
    `)

    return true
  } catch (error) {
    console.error('Error sending data access reminder:', error)
    return false
  }
}

/**
 * Send consent update notification to customer
 */
export async function sendConsentUpdateNotification(
  notification: ConsentUpdateNotification
): Promise<boolean> {
  try {
    console.log('[Notification] Consent Update:', {
      to: notification.customerEmail,
      consentType: notification.consentType,
      version: `${notification.currentVersion} → ${notification.newVersion}`,
    })

    console.log(`
Email Template:
To: ${notification.customerEmail}
Subject: Action Required: Updated ${notification.consentType}

Dear ${notification.customerName},

We have updated our ${notification.consentType}. Under PIPEDA regulations, we need your consent for these changes.

Current version: ${notification.currentVersion}
New version: ${notification.newVersion}

Please review and accept the updated consent:
${process.env.NEXT_PUBLIC_BASE_URL}/customer/consents

You can continue using our services, but we kindly ask you to review these updates at your earliest convenience.

If you have questions, please contact our support team.

Best regards,
TheAutoDoctor Team
    `)

    return true
  } catch (error) {
    console.error('Error sending consent update notification:', error)
    return false
  }
}

/**
 * Batch send insurance expiry alerts for all expiring workshops
 */
export async function sendBatchInsuranceExpiryAlerts(): Promise<{
  sent: number
  failed: number
}> {
  try {
    const supabase = await createClient()

    // Get workshops with expiring insurance
    const { data: expiringWorkshops, error } = await supabase
      .from('insurance_expiry_upcoming')
      .select('*')
      .order('days_until_expiry', { ascending: true })

    if (error || !expiringWorkshops) {
      console.error('Error fetching expiring workshops:', error)
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const workshop of expiringWorkshops) {
      const notification: InsuranceExpiryNotification = {
        organizationId: workshop.organization_id,
        organizationName: workshop.organization_name,
        contactEmail: workshop.contact_email,
        expiryDate: workshop.insurance_expiry_date,
        daysUntilExpiry: workshop.days_until_expiry,
        alertLevel: workshop.alert_level,
      }

      const success = await sendInsuranceExpiryAlert(notification)
      if (success) {
        sent++

        // Log notification in database
        await supabase.from('insurance_verification_log').insert({
          organization_id: workshop.organization_id,
          verification_type: 'expired_alert',
          verification_status: 'completed',
          notes: `Sent ${workshop.alert_level} alert: ${workshop.days_until_expiry} days until expiry`,
          verified_by: null, // System-generated
        })
      } else {
        failed++
      }
    }

    console.log(`[Batch Notification] Insurance alerts sent: ${sent}, failed: ${failed}`)
    return { sent, failed }
  } catch (error) {
    console.error('Error sending batch insurance alerts:', error)
    return { sent: 0, failed: 0 }
  }
}

/**
 * Batch send data access reminders for pending requests
 */
export async function sendBatchDataAccessReminders(): Promise<{
  sent: number
  failed: number
}> {
  try {
    const supabase = await createClient()

    // Get pending data access requests that are urgent (>20 days)
    const { data: pendingRequests, error } = await supabase
      .from('data_access_requests_pending')
      .select('*')
      .gte('days_pending', 20)
      .order('days_pending', { ascending: false })

    if (error || !pendingRequests) {
      console.error('Error fetching pending requests:', error)
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    for (const request of pendingRequests) {
      const notification: DataAccessReminderNotification = {
        customerId: request.customer_id,
        customerEmail: request.email,
        customerName: request.full_name,
        requestedAt: request.requested_at,
        daysPending: request.days_pending,
      }

      const success = await sendDataAccessReminder(notification)
      if (success) {
        sent++
      } else {
        failed++
      }
    }

    console.log(`[Batch Notification] Data access reminders sent: ${sent}, failed: ${failed}`)
    return { sent, failed }
  } catch (error) {
    console.error('Error sending batch data access reminders:', error)
    return { sent: 0, failed: 0 }
  }
}
