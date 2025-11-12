/**
 * Email Reminder Service for Scheduled Sessions
 *
 * Sends automated reminders to customers before their scheduled appointments:
 * - 24 hours before session
 * - 1 hour before session
 * - 15 minutes before session (if waiver not signed)
 *
 * Can be triggered by:
 * 1. Cron job (recommended for production)
 * 2. API endpoint (for manual trigger or testing)
 */

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type ReminderType = '24h' | '1h' | '15min'

interface ScheduledSession {
  id: string
  customer_user_id: string
  mechanic_user_id: string
  scheduled_for: string
  type: string
  waiver_signed_at: string | null
  reminder_24h_sent: boolean | null
  reminder_1h_sent: boolean | null
  reminder_15min_sent: boolean | null
  customer: {
    email: string
    full_name: string
  }
  mechanic: {
    full_name: string
    workshop_name: string | null
  }
}

/**
 * Get sessions that need reminders
 */
async function getSessionsNeedingReminders(reminderType: ReminderType): Promise<ScheduledSession[]> {
  const now = new Date()
  let startWindow: Date
  let endWindow: Date
  let reminderField: string

  switch (reminderType) {
    case '24h':
      // Sessions scheduled 23-25 hours from now
      startWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000)
      endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000)
      reminderField = 'reminder_24h_sent'
      break
    case '1h':
      // Sessions scheduled 55-65 minutes from now
      startWindow = new Date(now.getTime() + 55 * 60 * 1000)
      endWindow = new Date(now.getTime() + 65 * 60 * 1000)
      reminderField = 'reminder_1h_sent'
      break
    case '15min':
      // Sessions scheduled 10-20 minutes from now
      startWindow = new Date(now.getTime() + 10 * 60 * 1000)
      endWindow = new Date(now.getTime() + 20 * 60 * 1000)
      reminderField = 'reminder_15min_sent'
      break
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select(`
      id,
      customer_user_id,
      mechanic_user_id,
      scheduled_for,
      type,
      waiver_signed_at,
      reminder_24h_sent,
      reminder_1h_sent,
      reminder_15min_sent,
      customer:profiles!customer_user_id(email, full_name),
      mechanic:profiles!mechanic_user_id(full_name, workshop_name)
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_for', startWindow.toISOString())
    .lte('scheduled_for', endWindow.toISOString())
    .or(`${reminderField}.is.null,${reminderField}.eq.false`)

  if (error) {
    console.error(`[EmailReminders] Error fetching sessions for ${reminderType}:`, error)
    return []
  }

  return data as unknown as ScheduledSession[]
}

/**
 * Send 24-hour reminder
 */
async function send24HourReminder(session: ScheduledSession): Promise<boolean> {
  const scheduledDate = new Date(session.scheduled_for)
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const sessionTypeText = session.type === 'video' ? 'Online Video Session' : 'In-Person Workshop Visit'
  const mechanicName = session.mechanic.full_name || 'Your Mechanic'

  const subject = `Reminder: Your ${sessionTypeText} Tomorrow`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Session Tomorrow!</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
          Hi ${session.customer.full_name || 'there'},
        </p>

        <p style="color: #334155; font-size: 16px; margin-bottom: 30px;">
          This is a friendly reminder that your scheduled session is coming up tomorrow!
        </p>

        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h2 style="color: #f97316; margin: 0 0 15px 0; font-size: 18px;">${sessionTypeText}</h2>
          <p style="color: #64748b; margin: 5px 0;"><strong>Mechanic:</strong> ${mechanicName}</p>
          <p style="color: #64748b; margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="color: #64748b; margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
        </div>

        ${!session.waiver_signed_at ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>⚠️ Action Required:</strong> You'll need to sign a waiver before joining your session.
            We'll send you a reminder link closer to your appointment time.
          </p>
        </div>
        ` : ''}

        <div style="margin-bottom: 20px;">
          <h3 style="color: #334155; font-size: 16px; margin-bottom: 10px;">What to Prepare:</h3>
          <ul style="color: #64748b; font-size: 14px; line-height: 1.6;">
            ${session.type === 'video' ? `
            <li>Ensure you have a stable internet connection</li>
            <li>Test your camera and microphone</li>
            <li>Have your vehicle nearby if possible</li>
            <li>Gather any error codes or diagnostic information</li>
            ` : `
            <li>Ensure your vehicle is accessible</li>
            <li>Have your vehicle registration ready</li>
            <li>Note any error codes or warning lights</li>
            <li>Clear the work area if needed</li>
            `}
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${session.id}"
             style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Session Details
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
            Need to reschedule? Please cancel at least 24 hours in advance for a full refund.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
            Questions? Reply to this email or contact support.
          </p>
        </div>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: session.customer.email,
      subject,
      html
    })

    // Mark reminder as sent
    await supabaseAdmin
      .from('sessions')
      .update({ reminder_24h_sent: true })
      .eq('id', session.id)

    console.log(`[EmailReminders] 24h reminder sent for session ${session.id}`)
    return true
  } catch (error) {
    console.error(`[EmailReminders] Error sending 24h reminder for session ${session.id}:`, error)
    return false
  }
}

/**
 * Send 1-hour reminder
 */
async function send1HourReminder(session: ScheduledSession): Promise<boolean> {
  const scheduledDate = new Date(session.scheduled_for)
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const sessionTypeText = session.type === 'video' ? 'Online Video Session' : 'In-Person Workshop Visit'
  const mechanicName = session.mechanic.full_name || 'Your Mechanic'

  const subject = `Starting Soon: Your ${sessionTypeText} in 1 Hour`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Starting in 1 Hour!</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
          Hi ${session.customer.full_name || 'there'},
        </p>

        <p style="color: #334155; font-size: 16px; margin-bottom: 30px;">
          Your session with <strong>${mechanicName}</strong> starts in approximately 1 hour at <strong>${formattedTime}</strong>.
        </p>

        ${!session.waiver_signed_at ? `
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="color: #991b1b; margin: 0 0 10px 0; font-size: 14px;">
            <strong>⚠️ Waiver Required:</strong> You must sign the session waiver before joining.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${session.id}/waiver"
             style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">
            Sign Waiver Now
          </a>
        </div>
        ` : ''}

        <div style="margin-bottom: 20px;">
          <h3 style="color: #334155; font-size: 16px; margin-bottom: 10px;">Quick Checklist:</h3>
          <ul style="color: #64748b; font-size: 14px; line-height: 1.6;">
            ${session.type === 'video' ? `
            <li>✅ Test your camera and microphone</li>
            <li>✅ Find a quiet location</li>
            <li>✅ Have your vehicle nearby if possible</li>
            ` : `
            <li>✅ Ensure your vehicle is accessible</li>
            <li>✅ Clear the work area</li>
            <li>✅ Have tools ready if requested</li>
            `}
            ${!session.waiver_signed_at ? '<li>⚠️ Sign the session waiver (required)</li>' : '<li>✅ Waiver signed</li>'}
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${session.id}"
             style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
            ${session.waiver_signed_at ? 'Go to Session' : 'Sign Waiver & Join'}
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
            Running late? Please notify your mechanic as soon as possible.
          </p>
        </div>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: session.customer.email,
      subject,
      html
    })

    // Mark reminder as sent
    await supabaseAdmin
      .from('sessions')
      .update({ reminder_1h_sent: true })
      .eq('id', session.id)

    console.log(`[EmailReminders] 1h reminder sent for session ${session.id}`)
    return true
  } catch (error) {
    console.error(`[EmailReminders] Error sending 1h reminder for session ${session.id}:`, error)
    return false
  }
}

/**
 * Send 15-minute waiver reminder (only if waiver not signed)
 */
async function send15MinuteReminder(session: ScheduledSession): Promise<boolean> {
  // Only send if waiver not signed
  if (session.waiver_signed_at) {
    console.log(`[EmailReminders] Skipping 15min reminder for session ${session.id} - waiver already signed`)

    // Mark as sent so we don't check again
    await supabaseAdmin
      .from('sessions')
      .update({ reminder_15min_sent: true })
      .eq('id', session.id)

    return true
  }

  const scheduledDate = new Date(session.scheduled_for)
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })

  const subject = `🚨 Urgent: Sign Your Waiver - Session Starts in 15 Minutes`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Waiver Signature Required!</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
          Hi ${session.customer.full_name || 'there'},
        </p>

        <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
            Your session starts at ${formattedTime} - in just 15 minutes!
          </p>
          <p style="color: #991b1b; font-size: 14px; margin: 0;">
            You must sign the session waiver before you can join.
          </p>
        </div>

        <p style="color: #334155; font-size: 15px; margin-bottom: 30px;">
          Don't miss your appointment! Click the button below to sign the waiver now. It only takes 1 minute.
        </p>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${session.id}/waiver"
             style="background: #dc2626; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 18px;">
            Sign Waiver Now →
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
          <p style="color: #92400e; margin: 0; font-size: 13px;">
            <strong>Note:</strong> If the waiver is not signed by the scheduled time, your mechanic may need to cancel the session.
            This could result in a no-show fee per our cancellation policy.
          </p>
        </div>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: session.customer.email,
      subject,
      html
    })

    // Mark reminder as sent
    await supabaseAdmin
      .from('sessions')
      .update({ reminder_15min_sent: true })
      .eq('id', session.id)

    console.log(`[EmailReminders] 15min waiver reminder sent for session ${session.id}`)
    return true
  } catch (error) {
    console.error(`[EmailReminders] Error sending 15min reminder for session ${session.id}:`, error)
    return false
  }
}

/**
 * Process all reminders of a specific type
 */
export async function processReminders(reminderType: ReminderType): Promise<{
  success: number
  failed: number
  total: number
}> {
  console.log(`[EmailReminders] Processing ${reminderType} reminders...`)

  const sessions = await getSessionsNeedingReminders(reminderType)

  console.log(`[EmailReminders] Found ${sessions.length} sessions needing ${reminderType} reminder`)

  let success = 0
  let failed = 0

  for (const session of sessions) {
    let result: boolean

    switch (reminderType) {
      case '24h':
        result = await send24HourReminder(session)
        break
      case '1h':
        result = await send1HourReminder(session)
        break
      case '15min':
        result = await send15MinuteReminder(session)
        break
    }

    if (result) {
      success++
    } else {
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`[EmailReminders] ${reminderType} reminders complete: ${success} sent, ${failed} failed`)

  return {
    success,
    failed,
    total: sessions.length
  }
}

/**
 * Process all reminder types
 */
export async function processAllReminders(): Promise<{
  '24h': { success: number; failed: number; total: number }
  '1h': { success: number; failed: number; total: number }
  '15min': { success: number; failed: number; total: number }
}> {
  console.log('[EmailReminders] Starting all reminder processing...')

  const results = {
    '24h': await processReminders('24h'),
    '1h': await processReminders('1h'),
    '15min': await processReminders('15min')
  }

  console.log('[EmailReminders] All reminders processed:', results)

  return results
}
