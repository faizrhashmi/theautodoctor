/**
 * Session Cleanup Utilities
 *
 * Centralized session cleanup to prevent customers from being blocked
 * by stale sessions. Called from multiple points in the application
 * to ensure robustness.
 */

import { supabaseAdmin } from './supabaseAdmin'

export interface CleanupStats {
  oldWaitingSessions: number
  expiredRequests: number
  orphanedSessions: number
  totalCleaned: number
}

/**
 * Clean up old "waiting" sessions for a specific customer
 *
 * @param customerId - The customer user ID
 * @param maxAgeMinutes - Maximum age in minutes (default: 15)
 * @returns Number of sessions cleaned
 */
export async function cleanupCustomerWaitingSessions(
  customerId: string,
  maxAgeMinutes: number = 15
): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

  const { data: oldSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, created_at')
    .eq('customer_user_id', customerId)
    .eq('status', 'waiting')
    .lt('created_at', cutoffTime)

  if (!oldSessions || oldSessions.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Cancelling ${oldSessions.length} old waiting session(s) for customer ${customerId}`)

  await supabaseAdmin
    .from('sessions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('customer_user_id', customerId)
    .eq('status', 'waiting')
    .lt('created_at', cutoffTime)

  return oldSessions.length
}

/**
 * Clean up expired session requests and their associated sessions
 *
 * IMPORTANT: Pending requests should stay available for mechanics to see and accept.
 * Only cleanup requests that are VERY old (2+ hours) to avoid blocking the mechanic dashboard.
 *
 * @param maxAgeMinutes - Maximum age in minutes (default: 120 = 2 hours)
 * @returns Cleanup statistics
 */
export async function cleanupExpiredRequests(
  maxAgeMinutes: number = 120
): Promise<{ requests: number; sessions: number }> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

  // Find very old pending requests (2+ hours old)
  // These are likely abandoned - customer has left or given up
  const { data: expiredRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id')
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .lt('created_at', cutoffTime)

  if (!expiredRequests || expiredRequests.length === 0) {
    return { requests: 0, sessions: 0 }
  }

  console.log(`[sessionCleanup] Cancelling ${expiredRequests.length} expired request(s) older than ${maxAgeMinutes} minutes`)

  // Cancel the old requests
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .lt('created_at', cutoffTime)

  // Cancel associated waiting sessions
  const customerIds = [...new Set(expiredRequests.map(r => r.customer_id))]
  let sessionsCleaned = 0

  if (customerIds.length > 0) {
    const { data: cancelledSessions } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('customer_user_id', customerIds)
      .eq('status', 'waiting')
      .lt('created_at', cutoffTime)
      .select('id')

    sessionsCleaned = cancelledSessions?.length || 0
    console.log(`[sessionCleanup] Cancelled ${sessionsCleaned} associated waiting session(s)`)
  }

  return {
    requests: expiredRequests.length,
    sessions: sessionsCleaned,
  }
}

/**
 * Clean up orphaned sessions (sessions without valid requests)
 * Sessions that are "waiting" but don't have a corresponding pending request
 *
 * @param maxAgeMinutes - Maximum age in minutes (default: 120 = 2 hours)
 * @returns Number of orphaned sessions cleaned
 */
export async function cleanupOrphanedSessions(
  maxAgeMinutes: number = 120
): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

  // Find all waiting sessions older than cutoff
  const { data: waitingSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, customer_user_id')
    .eq('status', 'waiting')
    .lt('created_at', cutoffTime)

  if (!waitingSessions || waitingSessions.length === 0) {
    return 0
  }

  // Check which ones have valid pending requests
  const { data: pendingRequests } = await supabaseAdmin
    .from('session_requests')
    .select('customer_id')
    .eq('status', 'pending')
    .is('mechanic_id', null)

  const customersWithRequests = new Set(
    pendingRequests?.map(r => r.customer_id) || []
  )

  // Find orphaned sessions (no corresponding request)
  const orphanedSessions = waitingSessions.filter(
    session => {
      if (!session.customer_user_id) return false
      return !customersWithRequests.has(session.customer_user_id)
    }
  )

  if (orphanedSessions.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Cancelling ${orphanedSessions.length} orphaned session(s) older than ${maxAgeMinutes} minutes`)

  const orphanedIds = orphanedSessions.map(s => s.id)
  await supabaseAdmin
    .from('sessions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .in('id', orphanedIds)

  return orphanedSessions.length
}

/**
 * Comprehensive cleanup - runs all cleanup operations
 * Safe to call frequently, will only clean up problematic sessions
 *
 * IMPORTANT: Uses long timeouts to allow mechanics time to come online and accept requests
 *
 * @returns Cleanup statistics
 */
export async function runFullCleanup(): Promise<CleanupStats> {
  console.log('[sessionCleanup] Running full cleanup...')

  const [expiredResult, orphanedCount] = await Promise.all([
    cleanupExpiredRequests(120), // 2 hours - give mechanics time to see and accept requests
    cleanupOrphanedSessions(120), // 2 hours - match request cleanup time
  ])

  const stats: CleanupStats = {
    oldWaitingSessions: expiredResult.sessions,
    expiredRequests: expiredResult.requests,
    orphanedSessions: orphanedCount,
    totalCleaned: expiredResult.requests + expiredResult.sessions + orphanedCount,
  }

  if (stats.totalCleaned > 0) {
    console.log('[sessionCleanup] Cleanup complete:', stats)
  }

  return stats
}

/**
 * Check if customer has any active sessions
 * More lenient than the fulfillment check - only blocks truly active sessions
 *
 * @param customerId - The customer user ID
 * @returns Session info if blocked, null if clear
 */
export async function checkCustomerSessionStatus(customerId: string): Promise<{
  blocked: boolean
  session?: { id: string; status: string; created_at: string }
}> {
  // First, clean up old sessions
  await cleanupCustomerWaitingSessions(customerId, 15)

  // Check for truly active sessions (excluding just-cancelled ones)
  const { data: activeSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, status, created_at')
    .eq('customer_user_id', customerId)
    .in('status', ['waiting', 'live', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (!activeSessions || activeSessions.length === 0) {
    return { blocked: false }
  }

  const session = activeSessions[0]!

  // Double-check: If it's a waiting session, make sure it's recent
  if (session.status === 'waiting') {
    const sessionAge = Date.now() - new Date(session.created_at).getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (sessionAge > fifteenMinutes) {
      // This should have been cleaned up already, but force clean it now
      console.log(`[sessionCleanup] Force-cancelling stale waiting session ${session.id}`)
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', session.id)

      return { blocked: false }
    }
  }

  return {
    blocked: true,
    session: { id: session.id, status: session.status ?? 'unknown', created_at: session.created_at },
  }
}
