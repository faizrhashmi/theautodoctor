/**
 * Scheduled Session Checker Service
 *
 * Monitors scheduled sessions and triggers actions:
 * 1. Send waiver reminder 15 minutes before session
 * 2. Check for no-shows 10 minutes after scheduled time
 * 3. Apply compensation policy for no-shows
 */

import { supabaseAdmin } from './supabaseAdmin'
import { sendWaiverReminderEmail } from './email/waiverReminder'
import { sendNoShowNotification } from './email/noShowNotification'
import { calculateMechanicEarnings } from './platformFees'

interface ScheduledSession {
  id: string
  customer_user_id: string
  mechanic_user_id: string
  scheduled_for: string
  status: string
  type: string
  waiver_signed_at: string | null
  customer_email: string
  customer_name: string
  mechanic_email: string
  mechanic_name: string
}

export class ScheduledSessionChecker {
  /**
   * Find sessions that need waiver reminders (15 min before start)
   */
  async getSessionsNeedingWaiverReminder(): Promise<ScheduledSession[]> {
    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000)
    const sixteenMinutesFromNow = new Date(now.getTime() + 16 * 60000)

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        customer_user_id,
        mechanic_user_id,
        scheduled_for,
        status,
        type,
        waiver_signed_at,
        customer:profiles!customer_user_id(email, full_name),
        mechanic:profiles!mechanic_user_id(email, full_name)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_for', fifteenMinutesFromNow.toISOString())
      .lt('scheduled_for', sixteenMinutesFromNow.toISOString())
      .is('waiver_signed_at', null)

    if (error) {
      console.error('[ScheduledSessionChecker] Error fetching sessions for waiver reminder:', error)
      return []
    }

    // Transform to flat structure
    return (sessions || []).map((session: any) => ({
      id: session.id,
      customer_user_id: session.customer_user_id,
      mechanic_user_id: session.mechanic_user_id,
      scheduled_for: session.scheduled_for,
      status: session.status,
      type: session.type,
      waiver_signed_at: session.waiver_signed_at,
      customer_email: session.customer?.email || '',
      customer_name: session.customer?.full_name || 'Customer',
      mechanic_email: session.mechanic?.email || '',
      mechanic_name: session.mechanic?.full_name || 'Mechanic'
    }))
  }

  /**
   * Find sessions that are no-shows (10 min past scheduled time, no waiver signed)
   */
  async getNoShowSessions(): Promise<ScheduledSession[]> {
    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000)

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        customer_user_id,
        mechanic_user_id,
        scheduled_for,
        status,
        type,
        waiver_signed_at,
        customer:profiles!customer_user_id(email, full_name),
        mechanic:profiles!mechanic_user_id(email, full_name)
      `)
      .eq('status', 'scheduled')
      .lt('scheduled_for', tenMinutesAgo.toISOString())
      .is('waiver_signed_at', null)

    if (error) {
      console.error('[ScheduledSessionChecker] Error fetching no-show sessions:', error)
      return []
    }

    // Transform to flat structure
    return (sessions || []).map((session: any) => ({
      id: session.id,
      customer_user_id: session.customer_user_id,
      mechanic_user_id: session.mechanic_user_id,
      scheduled_for: session.scheduled_for,
      status: session.status,
      type: session.type,
      waiver_signed_at: session.waiver_signed_at,
      customer_email: session.customer?.email || '',
      customer_name: session.customer?.full_name || 'Customer',
      mechanic_email: session.mechanic?.email || '',
      mechanic_name: session.mechanic?.full_name || 'Mechanic'
    }))
  }

  /**
   * Send waiver reminder emails for sessions starting in 15 minutes
   */
  async sendWaiverReminders(): Promise<number> {
    const sessions = await this.getSessionsNeedingWaiverReminder()

    console.log(`[ScheduledSessionChecker] Found ${sessions.length} sessions needing waiver reminder`)

    let sentCount = 0
    for (const session of sessions) {
      try {
        await sendWaiverReminderEmail({
          to: session.customer_email,
          customerName: session.customer_name,
          mechanicName: session.mechanic_name,
          sessionId: session.id,
          scheduledFor: new Date(session.scheduled_for),
          sessionType: session.type
        })

        // Update session to mark reminder sent
        await supabaseAdmin
          .from('sessions')
          .update({ waiver_reminder_sent_at: new Date().toISOString() })
          .eq('id', session.id)

        sentCount++
        console.log(`[ScheduledSessionChecker] ✅ Waiver reminder sent for session ${session.id}`)
      } catch (error) {
        console.error(`[ScheduledSessionChecker] ❌ Failed to send waiver reminder for session ${session.id}:`, error)
      }
    }

    return sentCount
  }

  /**
   * Process no-show sessions and apply compensation policy
   * Policy: 50% to mechanic, 50% account credit to customer
   */
  async processNoShows(): Promise<number> {
    const sessions = await this.getNoShowSessions()

    console.log(`[ScheduledSessionChecker] Found ${sessions.length} no-show sessions`)

    let processedCount = 0
    for (const session of sessions) {
      try {
        // 1. Update session status to 'cancelled_no_show'
        await supabaseAdmin
          .from('sessions')
          .update({
            status: 'cancelled_no_show',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Customer no-show - waiver not signed'
          })
          .eq('id', session.id)

        // 2. Get payment amount (could be full or deposit)
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('amount')
          .eq('session_id', session.id)
          .single()

        const paidAmount = payment?.amount || 0
        // Calculate mechanic share using database-driven fees (70/30 split)
        const paidAmountCents = Math.round(paidAmount * 100)
        const mechanicShareCents = await calculateMechanicEarnings(paidAmountCents)
        const mechanicShare = mechanicShareCents / 100
        const customerCredit = paidAmount - mechanicShare

        // 3. Create mechanic compensation record
        await supabaseAdmin
          .from('mechanic_earnings')
          .insert({
            mechanic_user_id: session.mechanic_user_id,
            session_id: session.id,
            amount: mechanicShare,
            type: 'no_show_compensation',
            status: 'pending_payout',
            created_at: new Date().toISOString()
          })

        // 4. Create customer credit record
        await supabaseAdmin
          .from('customer_credits')
          .insert({
            customer_user_id: session.customer_user_id,
            session_id: session.id,
            amount: customerCredit,
            type: 'no_show_credit',
            status: 'available',
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
            created_at: new Date().toISOString()
          })

        // 5. Send notifications to both parties
        await sendNoShowNotification({
          customerEmail: session.customer_email,
          customerName: session.customer_name,
          mechanicEmail: session.mechanic_email,
          mechanicName: session.mechanic_name,
          sessionId: session.id,
          scheduledFor: new Date(session.scheduled_for),
          mechanicCompensation: mechanicShare,
          customerCredit: customerCredit
        })

        processedCount++
        console.log(`[ScheduledSessionChecker] ✅ No-show processed for session ${session.id}`)
      } catch (error) {
        console.error(`[ScheduledSessionChecker] ❌ Failed to process no-show for session ${session.id}:`, error)
      }
    }

    return processedCount
  }

  /**
   * Run all checks (called by cron job)
   */
  async runAllChecks(): Promise<{ remindersSent: number; noShowsProcessed: number }> {
    console.log('[ScheduledSessionChecker] 🔄 Running scheduled session checks...')

    const remindersSent = await this.sendWaiverReminders()
    const noShowsProcessed = await this.processNoShows()

    console.log(`[ScheduledSessionChecker] ✅ Complete: ${remindersSent} reminders sent, ${noShowsProcessed} no-shows processed`)

    return { remindersSent, noShowsProcessed }
  }
}

// Export singleton instance
export const scheduledSessionChecker = new ScheduledSessionChecker()
