import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface QueueEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  priority?: number // 1-10 (1=highest priority)
  scheduleFor?: Date // Optional: schedule email for future delivery
}

/**
 * Add an email to the Supabase queue for reliable delivery
 *
 * @param options Email options
 * @returns Promise<{ success: boolean, id?: string, error?: string }>
 *
 * @example
 * ```typescript
 * // Send immediate email with default priority
 * await queueEmail({
 *   to: 'customer@example.com',
 *   subject: 'Session Confirmed',
 *   html: '<h1>Your session is confirmed!</h1>'
 * })
 *
 * // High-priority email
 * await queueEmail({
 *   to: 'mechanic@example.com',
 *   subject: 'New Session Assignment',
 *   html: '<h1>You have a new session!</h1>',
 *   priority: 1 // Highest priority
 * })
 *
 * // Scheduled email (send in 1 hour)
 * await queueEmail({
 *   to: 'customer@example.com',
 *   subject: 'Session Reminder',
 *   html: '<h1>Your session starts in 1 hour</h1>',
 *   scheduleFor: new Date(Date.now() + 60 * 60 * 1000)
 * })
 * ```
 */
export async function queueEmail(options: QueueEmailOptions): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .insert({
        to_email: options.to,
        from_email: options.from || 'noreply@theautodoctor.ca',
        subject: options.subject,
        html_body: options.html,
        text_body: options.text || stripHtml(options.html),
        priority: options.priority || 5,
        scheduled_for: options.scheduleFor?.toISOString() || new Date().toISOString(),
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[queueEmail] Failed to queue email:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    console.log(`[queueEmail] Email queued successfully: ${data.id}`)
    return {
      success: true,
      id: data.id,
    }
  } catch (error: any) {
    console.error('[queueEmail] Unexpected error:', error)
    return {
      success: false,
      error: error?.message || 'Unknown error',
    }
  }
}

/**
 * Simple HTML tag stripper for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .trim()
}

/**
 * Priority levels for common email types
 */
export const EMAIL_PRIORITY = {
  CRITICAL: 1, // Password resets, account security
  HIGH: 2, // New session assignments, urgent notifications
  NORMAL: 5, // Confirmations, receipts
  LOW: 8, // Marketing, newsletters
  BULK: 10, // Mass notifications
} as const
