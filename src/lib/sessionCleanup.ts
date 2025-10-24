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
  acceptedRequests: number
  orphanedSessions: number
  unattendedRequests: number
  expiredTokens: number
  orphanedAcceptedRequests: number
  totalCleaned: number
}

/**
 * Clean up old "waiting" sessions for a specific customer
 *
 * CRITICAL SAFETY RULE: NEVER cancel sessions if a mechanic has been assigned!
 * Only clean up truly abandoned sessions where NO mechanic accepted.
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

  // SAFETY: Only find sessions with NO mechanic assigned (truly abandoned)
  const { data: oldSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, created_at, mechanic_id')
    .eq('customer_user_id', customerId)
    .eq('status', 'waiting')
    .is('mechanic_id', null) // CRITICAL: Only unassigned sessions
    .lt('created_at', cutoffTime)

  if (!oldSessions || oldSessions.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Cancelling ${oldSessions.length} old UNASSIGNED waiting session(s) for customer ${customerId}`)

  await supabaseAdmin
    .from('sessions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('customer_user_id', customerId)
    .eq('status', 'waiting')
    .is('mechanic_id', null) // SAFETY: Only cancel unassigned sessions
    .lt('created_at', cutoffTime)

  return oldSessions.length
}

/**
 * Mark unattended session requests based on PLAN DURATION
 *
 * IMPROVED BUSINESS RULE: Customers paid for a specific session duration (30/45/60 min).
 * Give them the FULL DURATION they paid for before marking as unattended.
 * - chat10: 30 minutes paid → wait 30 minutes before marking unattended
 * - video15: 45 minutes paid → wait 45 minutes before marking unattended
 * - diagnostic: 60 minutes paid → wait 60 minutes before marking unattended
 *
 * After unattended, requests remain valid until Stripe token expires (120 min total).
 * This gives customers and mechanics their full paid time to join the session.
 *
 * @returns Number of requests marked as unattended
 */
export async function markUnattendedRequests(): Promise<number> {
  // Get all pending requests with their session info
  const { data: pendingRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id, created_at, plan_code')
    .eq('status', 'pending')
    .is('mechanic_id', null)

  if (!pendingRequests || pendingRequests.length === 0) {
    return 0
  }

  // Map plan codes to their durations (in minutes)
  const planDurations: Record<string, number> = {
    'chat10': 30,      // Quick Chat: 30 minutes
    'video15': 45,     // Standard Video: 45 minutes
    'diagnostic': 60,  // Full Diagnostic: 60 minutes
  }

  const now = Date.now()
  const requestsToMarkUnattended: string[] = []

  // Check each request individually based on its plan duration
  for (const request of pendingRequests) {
    const planDuration = planDurations[request.plan_code] || 30 // Default to 30 min
    const requestAge = (now - new Date(request.created_at).getTime()) / (1000 * 60) // Age in minutes

    if (requestAge > planDuration) {
      requestsToMarkUnattended.push(request.id)
      console.log(
        `[sessionCleanup] Request ${request.id} (plan: ${request.plan_code}, duration: ${planDuration}min) ` +
        `is ${Math.round(requestAge)}min old → marking as unattended`
      )
    }
  }

  if (requestsToMarkUnattended.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Marking ${requestsToMarkUnattended.length} pending request(s) as unattended (exceeded plan duration)`)

  // Mark as unattended (don't cancel - mechanics/admins can still accept)
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'unattended' })
    .in('id', requestsToMarkUnattended)

  return requestsToMarkUnattended.length
}

/**
 * Expire requests with old Stripe tokens (> 2 hours)
 *
 * CRITICAL SAFETY RULE: NEVER expire requests or cancel sessions if a mechanic has been assigned!
 * Only clean up truly abandoned requests where NO mechanic accepted.
 *
 * BUSINESS RULE: Stripe payment sessions expire after 2 hours.
 * After that, the payment token is no longer valid and customer must re-request.
 * This applies to both 'pending' and 'unattended' requests WHERE NO MECHANIC WAS ASSIGNED.
 *
 * @param maxAgeMinutes - Maximum age in minutes (default: 120 minutes = 2 hours)
 * @returns Number of requests expired
 */
export async function expireOldStripeTokens(
  maxAgeMinutes: number = 120
): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

  // SAFETY: Only find requests with NO mechanic assigned (truly abandoned)
  const { data: expiredRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id, mechanic_id')
    .in('status', ['pending', 'unattended'])
    .is('mechanic_id', null) // CRITICAL: Only unassigned requests
    .lt('created_at', cutoffTime)

  if (!expiredRequests || expiredRequests.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Expiring ${expiredRequests.length} UNASSIGNED request(s) with old Stripe tokens (older than ${maxAgeMinutes} minutes)`)

  // Mark as expired (payment token no longer valid)
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'expired' })
    .in('status', ['pending', 'unattended'])
    .is('mechanic_id', null) // SAFETY: Only unassigned
    .lt('created_at', cutoffTime)

  // SAFETY: Only cancel sessions that have NO mechanic assigned
  const customerIds = [...new Set(expiredRequests.map(r => r.customer_id))]

  if (customerIds.length > 0) {
    console.log(`[sessionCleanup] Cancelling waiting sessions for ${customerIds.length} customer(s) with no mechanic assigned`)

    await supabaseAdmin
      .from('sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('customer_user_id', customerIds)
      .eq('status', 'waiting')
      .is('mechanic_id', null) // CRITICAL: Only cancel sessions with no mechanic
      .lt('created_at', cutoffTime)
  }

  return expiredRequests.length
}

/**
 * Clean up ORPHANED accepted requests (request accepted but session completed/cancelled)
 *
 * CRITICAL FIX: Sometimes when sessions end, the session_request isn't updated from 'accepted' to 'completed'.
 * This leaves orphaned 'accepted' requests that block mechanics from accepting new requests.
 * This function finds and fixes those orphaned requests.
 *
 * @returns Number of orphaned requests fixed
 */
export async function cleanupOrphanedAcceptedRequests(): Promise<number> {
  // Find accepted requests where the corresponding session is completed or cancelled
  const { data: acceptedRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, session_id, mechanic_id, accepted_at')
    .eq('status', 'accepted')

  if (!acceptedRequests || acceptedRequests.length === 0) {
    return 0
  }

  const orphanedRequestIds: string[] = []

  // Check each accepted request to see if its session is still active
  for (const request of acceptedRequests) {
    if (!request.session_id) {
      // No session_id at all - definitely orphaned
      orphanedRequestIds.push(request.id)
      continue
    }

    // Check if the session is completed or cancelled
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id, status')
      .eq('id', request.session_id)
      .maybeSingle()

    if (!session || ['completed', 'cancelled'].includes(session.status?.toLowerCase() || '')) {
      // Session doesn't exist or is completed/cancelled - this request is orphaned
      orphanedRequestIds.push(request.id)
      console.log(
        `[sessionCleanup] Found orphaned accepted request ${request.id} ` +
        `(session ${request.session_id} is ${session?.status || 'missing'})`
      )
    }
  }

  if (orphanedRequestIds.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Fixing ${orphanedRequestIds.length} orphaned accepted request(s)`)

  // Mark orphaned requests as completed
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'completed' })
    .in('id', orphanedRequestIds)

  return orphanedRequestIds.length
}

/**
 * Clean up old ACCEPTED requests that were never started
 *
 * REAL-TIME BUSINESS RULE: Accepted requests expire after 30 minutes.
 * When a mechanic accepts a request, customer has 30 minutes to join.
 * If customer doesn't join within 30 minutes, request is cancelled to free up the mechanic.
 *
 * @param maxAgeMinutes - Maximum age in minutes (default: 30 minutes for real-time business)
 * @returns Number of accepted requests cleaned
 */
export async function cleanupAcceptedRequests(
  maxAgeMinutes: number = 30
): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()

  // Find old accepted requests (> 30 minutes old by default)
  // These were accepted by mechanics but customers never started the session
  // Also catch data integrity issues: accepted=true but mechanic_id=null
  const { data: oldAcceptedRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, customer_id, mechanic_id, accepted_at')
    .eq('status', 'accepted')
    .lt('accepted_at', cutoffTime)

  if (!oldAcceptedRequests || oldAcceptedRequests.length === 0) {
    return 0
  }

  console.log(`[sessionCleanup] Cancelling ${oldAcceptedRequests.length} old accepted request(s) older than ${maxAgeMinutes} minutes`)

  // Cancel the old accepted requests (note: session_requests table has no updated_at column)
  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'cancelled' })
    .eq('status', 'accepted')
    .lt('accepted_at', cutoffTime)

  return oldAcceptedRequests.length
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
 * IMPROVED TIMEOUT SYSTEM (Plan Duration-Based):
 * - Pending requests → unattended: Plan duration (30/45/60 min based on what customer paid for)
 * - Unattended → expired: 120 minutes (Stripe token expires, customer must re-request)
 * - Accepted requests: 30 minutes (if customer doesn't join, free up mechanic)
 * - Orphaned sessions: 60 minutes (waiting sessions without valid requests)
 *
 * @returns Cleanup statistics
 */
export async function runFullCleanup(): Promise<CleanupStats> {
  console.log('[sessionCleanup] Running full cleanup...')

  const [unattendedCount, expiredTokens, acceptedCount, orphanedCount, orphanedAcceptedCount] = await Promise.all([
    markUnattendedRequests(), // Uses plan duration (30/45/60 min) - give customers full paid time
    expireOldStripeTokens(120), // 120 minutes (2 hours) - expire Stripe payment tokens
    cleanupAcceptedRequests(30), // 30 minutes - accepted requests that customers never joined
    cleanupOrphanedSessions(60), // 60 minutes - orphaned waiting sessions
    cleanupOrphanedAcceptedRequests(), // CRITICAL: Fix orphaned accepted requests blocking mechanics
  ])

  const stats: CleanupStats = {
    oldWaitingSessions: 0, // No longer tracked separately
    expiredRequests: 0, // Replaced by unattended → expired flow
    acceptedRequests: acceptedCount,
    orphanedSessions: orphanedCount,
    unattendedRequests: unattendedCount,
    expiredTokens: expiredTokens,
    orphanedAcceptedRequests: orphanedAcceptedCount,
    totalCleaned: unattendedCount + expiredTokens + acceptedCount + orphanedCount + orphanedAcceptedCount,
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

  // Fetch full session details to check mechanic assignment
  const { data: fullSession } = await supabaseAdmin
    .from('sessions')
    .select('id, status, created_at, mechanic_id')
    .eq('id', session.id)
    .maybeSingle()

  if (!fullSession) {
    return { blocked: false }
  }

  // CRITICAL SAFETY: If it's a waiting session, check if it's assigned before cancelling
  if (fullSession.status === 'waiting') {
    const sessionAge = Date.now() - new Date(fullSession.created_at).getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (sessionAge > fifteenMinutes) {
      // SAFETY CHECK: Only cancel if NO mechanic is assigned
      if (!fullSession.mechanic_id) {
        console.log(`[sessionCleanup] Force-cancelling stale UNASSIGNED waiting session ${fullSession.id}`)
        await supabaseAdmin
          .from('sessions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', fullSession.id)
          .is('mechanic_id', null) // SAFETY: Double-check no mechanic assigned

        return { blocked: false }
      } else {
        console.log(`[sessionCleanup] Session ${fullSession.id} is old but has mechanic ${fullSession.mechanic_id} assigned - NOT cancelling`)
      }
    }
  }

  return {
    blocked: true,
    session: { id: fullSession.id, status: fullSession.status ?? 'unknown', created_at: fullSession.created_at },
  }
}
