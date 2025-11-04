/**
 * Session Summary Generator
 *
 * Extracts findings from chat messages and mechanic notes
 * to create unified session summaries
 *
 * Strategy: Deterministic extraction (no AI dependency)
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { IdentifiedIssue, CreateSummaryPayload } from '@/types/sessionSummary'

interface ChatMessage {
  content: string
  sender_role: string
  created_at: string
}

interface SessionData {
  id: string
  type: 'chat' | 'video'
  mechanic_notes?: string | null
  messages?: ChatMessage[]
  file_ids?: string[]
}

/**
 * Extract identified issues from text using deterministic patterns
 */
function extractIssues(text: string): IdentifiedIssue[] {
  if (!text) return []

  const issues: IdentifiedIssue[] = []

  // Pattern 1: "Issue: <description>"
  const issuePattern = /issue[:\s]+([^\n.!?]+)/gi
  let match
  while ((match = issuePattern.exec(text)) !== null) {
    issues.push({
      issue: match[1].trim(),
      severity: 'medium', // Default
    })
  }

  // Pattern 2: "Problem: <description>"
  const problemPattern = /problem[:\s]+([^\n.!?]+)/gi
  while ((match = problemPattern.exec(text)) !== null) {
    issues.push({
      issue: match[1].trim(),
      severity: 'medium',
    })
  }

  // Pattern 3: Severity indicators
  const severityPatterns: Record<string, RegExp[]> = {
    urgent: [/urgent/i, /critical/i, /immediately/i, /dangerous/i],
    high: [/important/i, /soon/i, /asap/i, /needs attention/i],
    low: [/minor/i, /small/i, /cosmetic/i, /optional/i],
  }

  // Assign severity based on text context
  issues.forEach((issue) => {
    const fullText = text.toLowerCase()
    if (severityPatterns.urgent.some((p) => p.test(fullText))) {
      issue.severity = 'urgent'
    } else if (severityPatterns.high.some((p) => p.test(fullText))) {
      issue.severity = 'high'
    } else if (severityPatterns.low.some((p) => p.test(fullText))) {
      issue.severity = 'low'
    }
  })

  // Pattern 4: Cost estimates
  const costPattern = /\$(\d+)[-\s]*\$?(\d+)?/g
  issues.forEach((issue) => {
    const costMatch = costPattern.exec(issue.issue)
    if (costMatch) {
      if (costMatch[2]) {
        issue.est_cost_range = `$${costMatch[1]}-$${costMatch[2]}`
      } else {
        issue.est_cost_range = `~$${costMatch[1]}`
      }
    }
  })

  return issues
}

/**
 * Generate customer-friendly report from raw findings
 */
function generateCustomerReport(sessionData: SessionData): string {
  const parts: string[] = []

  // Chat summary
  if (sessionData.messages && sessionData.messages.length > 0) {
    const mechanicMessages = sessionData.messages.filter(
      (m) => m.sender_role === 'mechanic'
    )

    if (mechanicMessages.length > 0) {
      parts.push('## Session Discussion\n')
      parts.push(
        `During this ${sessionData.type} session, your mechanic provided guidance and answered your questions.`
      )
    }
  }

  // Mechanic notes
  if (sessionData.mechanic_notes) {
    parts.push('\n## Mechanic Findings\n')
    parts.push(sessionData.mechanic_notes)
  }

  // Fallback
  if (parts.length === 0) {
    parts.push('Session completed. No detailed findings were recorded.')
  }

  return parts.join('\n')
}

/**
 * Generate summary from chat session
 */
export async function generateChatSessionSummary(
  sessionId: string
): Promise<CreateSummaryPayload | null> {
  try {
    console.log(`[SUMMARY] Generating summary for chat session ${sessionId}`)

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, type, mechanic_notes')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[SUMMARY] Session not found:', sessionError)
      return null
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('content, sender_role, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[SUMMARY] Failed to fetch messages:', messagesError)
    }

    // Fetch session files
    const { data: files, error: filesError } = await supabaseAdmin
      .from('session_files')
      .select('id')
      .eq('session_id', sessionId)

    if (filesError) {
      console.error('[SUMMARY] Failed to fetch files:', filesError)
    }

    const sessionData: SessionData = {
      id: session.id,
      type: 'chat',
      mechanic_notes: session.mechanic_notes,
      messages: messages || [],
      file_ids: files?.map((f) => f.id) || [],
    }

    // Extract findings from all text
    const allText = [
      sessionData.mechanic_notes || '',
      ...(sessionData.messages?.map((m) => m.content) || []),
    ].join(' ')

    const identified_issues = extractIssues(allText)
    const customer_report = generateCustomerReport(sessionData)

    console.log(`[SUMMARY] Extracted ${identified_issues.length} issues from chat session`)

    return {
      session_id: sessionId,
      session_type: 'chat',
      customer_report,
      identified_issues,
      media_file_ids: sessionData.file_ids,
    }
  } catch (error) {
    console.error('[SUMMARY] Error generating chat summary:', error)
    return null
  }
}

/**
 * Generate summary from video session
 */
export async function generateVideoSessionSummary(
  sessionId: string
): Promise<CreateSummaryPayload | null> {
  try {
    console.log(`[SUMMARY] Generating summary for video session ${sessionId}`)

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, type, mechanic_notes')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[SUMMARY] Session not found:', sessionError)
      return null
    }

    // Fetch session files
    const { data: files, error: filesError } = await supabaseAdmin
      .from('session_files')
      .select('id')
      .eq('session_id', sessionId)

    if (filesError) {
      console.error('[SUMMARY] Failed to fetch files:', filesError)
    }

    const sessionData: SessionData = {
      id: session.id,
      type: 'video',
      mechanic_notes: session.mechanic_notes,
      file_ids: files?.map((f) => f.id) || [],
    }

    const allText = sessionData.mechanic_notes || ''
    const identified_issues = extractIssues(allText)
    const customer_report = generateCustomerReport(sessionData)

    console.log(`[SUMMARY] Extracted ${identified_issues.length} issues from video session`)

    return {
      session_id: sessionId,
      session_type: 'video',
      customer_report,
      identified_issues,
      media_file_ids: sessionData.file_ids,
    }
  } catch (error) {
    console.error('[SUMMARY] Error generating video summary:', error)
    return null
  }
}

/**
 * Persist summary to database
 * Phase 3.1: Now sends enhanced summary email after save
 */
export async function saveSummary(
  payload: CreateSummaryPayload
): Promise<boolean> {
  try {
    console.log(`[SUMMARY] Saving summary for session ${payload.session_id}`)

    const { error } = await supabaseAdmin
      .from('session_summaries')
      .upsert(
        {
          session_id: payload.session_id,
          session_type: payload.session_type,
          customer_report: payload.customer_report || null,
          identified_issues: payload.identified_issues || [],
          media_file_ids: payload.media_file_ids || [],
        },
        { onConflict: 'session_id' }
      )

    if (error) {
      console.error('[SUMMARY] Failed to save summary:', error)
      return false
    }

    console.log(`[SUMMARY] ✓ Summary saved for session ${payload.session_id}`)

    // Fetch session details for notifications and email
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('customer_user_id, mechanic_id')
      .eq('id', payload.session_id)
      .single()

    if (!session?.customer_user_id) {
      console.warn('[SUMMARY] No customer found for session')
      return true // Still return success for summary save
    }

    // Create notification for customer
    await supabaseAdmin.from('notifications').insert({
      user_id: session.customer_user_id,
      type: 'summary_ready',
      payload: {
        session_id: payload.session_id,
        session_type: payload.session_type,
        issue_count: payload.identified_issues?.length || 0,
      },
    })
    console.log(`[SUMMARY] ✓ Notification created for customer`)

    // Phase 3.1: Send enhanced summary email
    try {
      // Fetch customer profile
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', session.customer_user_id)
        .single()

      // Fetch mechanic info
      let mechanicName = 'Your Mechanic'
      if (session.mechanic_id) {
        const { data: mechanicProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', session.mechanic_id)
          .single()

        if (mechanicProfile?.full_name) {
          mechanicName = mechanicProfile.full_name
        } else {
          // Try mechanics table as fallback
          const { data: mechanic } = await supabaseAdmin
            .from('mechanics')
            .select('name')
            .eq('id', session.mechanic_id)
            .single()

          if (mechanic?.name) {
            mechanicName = mechanic.name
          }
        }
      }

      if (customerProfile?.email) {
        const { sendSummaryDeliveredEmail } = await import('@/lib/email/templates')

        await sendSummaryDeliveredEmail({
          sessionId: payload.session_id,
          customerEmail: customerProfile.email,
          customerName: customerProfile.full_name || 'Customer',
          mechanicName,
          summary: {
            customer_report: payload.customer_report,
            identified_issues: payload.identified_issues,
            media_file_ids: payload.media_file_ids,
            session_type: payload.session_type,
          },
        })
        console.log(`[SUMMARY] ✓ Summary email sent to ${customerProfile.email}`)
      } else {
        console.warn('[SUMMARY] No customer email found - skipping summary email')
      }
    } catch (emailError) {
      // Don't fail summary save if email fails
      console.error('[SUMMARY] Failed to send summary email:', emailError)
    }

    return true
  } catch (error) {
    console.error('[SUMMARY] Error saving summary:', error)
    return false
  }
}

/**
 * Generate and save summary (unified)
 */
export async function createSessionSummary(
  sessionId: string,
  sessionType: 'chat' | 'video'
): Promise<boolean> {
  console.log(`[SUMMARY] Creating summary for ${sessionType} session ${sessionId}`)

  const payload =
    sessionType === 'chat'
      ? await generateChatSessionSummary(sessionId)
      : await generateVideoSessionSummary(sessionId)

  if (!payload) {
    console.warn('[SUMMARY] Failed to generate summary payload')
    return false
  }

  return await saveSummary(payload)
}
