/**
 * G1: STRUCTURED LOGGING & TIMELINE
 *
 * Centralized logging system for session lifecycle events.
 * Emits structured logs that can be used to reconstruct any session's story.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export type LogEvent =
  | 'request.created'
  | 'request.accepted'
  | 'request.cancelled'
  | 'session.created'
  | 'session.joined'
  | 'session.started'
  | 'session.ended'
  | 'session.completed'
  | 'session.cancelled'
  | 'cleanup.customer_no_show'
  | 'cleanup.mechanic_no_show'
  | 'cleanup.stuck_session'
  | 'refund.issued'
  | 'refund.succeeded'
  | 'dispute.created'
  | 'payment.succeeded'
  | 'claim.created'
  | 'claim.approved'
  | 'claim.rejected'

export interface LogMetadata {
  [key: string]: any
}

export interface LogEntry {
  level: LogLevel
  event: LogEvent
  message: string
  sessionId?: string | null
  mechanicId?: string | null
  customerId?: string | null
  requestId?: string | null
  metadata?: LogMetadata
  timestamp?: string
}

/**
 * Emit a structured log entry
 * Logs to both console and database
 */
export async function log(entry: LogEntry): Promise<void> {
  const timestamp = entry.timestamp || new Date().toISOString()

  // Console logging with structured format
  const consolePrefix = `[${entry.level.toUpperCase()}] [${entry.event}]`
  const contextParts: string[] = []

  if (entry.sessionId) contextParts.push(`session=${entry.sessionId}`)
  if (entry.mechanicId) contextParts.push(`mechanic=${entry.mechanicId}`)
  if (entry.customerId) contextParts.push(`customer=${entry.customerId}`)
  if (entry.requestId) contextParts.push(`request=${entry.requestId}`)

  const contextStr = contextParts.length > 0 ? `[${contextParts.join(' ')}]` : ''
  const metadataStr = entry.metadata ? JSON.stringify(entry.metadata) : ''

  console.log(`${consolePrefix} ${contextStr} ${entry.message} ${metadataStr}`.trim())

  // Database logging (async, non-blocking)
  try {
    await supabaseAdmin.from('session_logs').insert({
      level: entry.level,
      event: entry.event,
      message: entry.message,
      session_id: entry.sessionId || null,
      mechanic_id: entry.mechanicId || null,
      customer_id: entry.customerId || null,
      request_id: entry.requestId || null,
      metadata: entry.metadata || {},
      created_at: timestamp,
    })
  } catch (error) {
    console.error('[LOG] Failed to write to database:', error)
  }
}

/**
 * Convenience wrappers for different log levels
 */

export function logInfo(event: LogEvent, message: string, context?: Partial<LogEntry>): Promise<void> {
  return log({
    level: 'info',
    event,
    message,
    ...context,
  })
}

export function logWarn(event: LogEvent, message: string, context?: Partial<LogEntry>): Promise<void> {
  return log({
    level: 'warn',
    event,
    message,
    ...context,
  })
}

export function logError(event: LogEvent, message: string, context?: Partial<LogEntry>): Promise<void> {
  return log({
    level: 'error',
    event,
    message,
    ...context,
  })
}

export function logDebug(event: LogEvent, message: string, context?: Partial<LogEntry>): Promise<void> {
  return log({
    level: 'debug',
    event,
    message,
    ...context,
  })
}

/**
 * Get timeline for a session (all logs + status changes)
 */
export async function getSessionTimeline(sessionId: string): Promise<any[]> {
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('session_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (logsError) {
    console.error('[LOG] Error fetching session timeline:', logsError)
    return []
  }

  return logs || []
}

/**
 * Get timeline for a request (all logs related to a request)
 */
export async function getRequestTimeline(requestId: string): Promise<any[]> {
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('session_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (logsError) {
    console.error('[LOG] Error fetching request timeline:', logsError)
    return []
  }

  return logs || []
}
