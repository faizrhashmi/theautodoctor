/**
 * Persistent Real-time Channels for Supabase Broadcasts
 *
 * This module manages long-lived broadcast channels to avoid race conditions
 * that occur when creating/destroying channels for each broadcast.
 *
 * CRITICAL: In production environments with network latency, ephemeral channels
 * can be destroyed before broadcasts fully propagate to all listeners.
 */

import { supabaseAdmin } from './supabaseAdmin'

// Persistent channel for broadcasting session assignment updates
let sessionAssignmentsChannel: any = null
let sessionAssignmentsChannelStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'

/**
 * Get or create the persistent session_assignments_feed broadcast channel
 *
 * This channel is used to notify mechanics of new session assignments,
 * accepted assignments, and cancelled assignments in real-time.
 */
export async function getSessionAssignmentsChannel() {
  // Return existing connected channel
  if (sessionAssignmentsChannel && sessionAssignmentsChannelStatus === 'connected') {
    return sessionAssignmentsChannel
  }

  // If currently connecting, wait for connection
  if (sessionAssignmentsChannelStatus === 'connecting') {
    return new Promise<any>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (sessionAssignmentsChannelStatus === 'connected' && sessionAssignmentsChannel) {
          clearInterval(checkInterval)
          resolve(sessionAssignmentsChannel)
        } else if (sessionAssignmentsChannelStatus === 'error') {
          clearInterval(checkInterval)
          reject(new Error('Channel connection failed'))
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('Channel connection timeout'))
      }, 10000)
    })
  }

  // Create new channel
  sessionAssignmentsChannelStatus = 'connecting'
  sessionAssignmentsChannel = supabaseAdmin.channel('session_assignments_feed', {
    config: {
      broadcast: { self: false }, // Don't receive own broadcasts
    },
  })

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        sessionAssignmentsChannelStatus = 'error'
        reject(new Error('Channel subscription timeout after 5 seconds'))
      }, 5000)

      sessionAssignmentsChannel.subscribe((status: string, err: any) => {
        console.log(`[RealtimeChannels] session_assignments_feed status: ${status}`)

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          sessionAssignmentsChannelStatus = 'connected'
          console.log('[RealtimeChannels] ✅ session_assignments_feed channel ready')
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout)
          sessionAssignmentsChannelStatus = 'error'
          console.error('[RealtimeChannels] ❌ Channel subscription failed:', status, err)
          reject(err || new Error(`Channel subscription failed: ${status}`))
        }
      })
    })

    return sessionAssignmentsChannel
  } catch (error) {
    // Reset state on error so next attempt can try again
    sessionAssignmentsChannelStatus = 'disconnected'
    sessionAssignmentsChannel = null
    throw error
  }
}

/**
 * Broadcast a session assignment event to all listening mechanics
 *
 * @param event - The type of event (new_assignment, assignment_accepted, assignment_cancelled)
 * @param payload - The event payload containing assignment details
 *
 * This uses a persistent channel to avoid race conditions where broadcasts
 * are lost due to premature channel closure.
 */
export async function broadcastSessionAssignment(
  event: 'new_assignment' | 'assignment_accepted' | 'assignment_cancelled',
  payload: Record<string, unknown>
) {
  const startTime = Date.now()

  try {
    console.log(`[RealtimeChannels] 📡 Preparing to broadcast ${event}...`)

    const channel = await getSessionAssignmentsChannel()

    console.log(`[RealtimeChannels] Broadcasting ${event} with payload:`, {
      assignmentId: (payload.assignment as any)?.id?.substring(0, 8),
      sessionId: (payload.assignment as any)?.session_id?.substring(0, 8),
      event,
      timestamp: new Date().toISOString(),
    })

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })

    const duration = Date.now() - startTime
    console.log(`[RealtimeChannels] ✅ Successfully broadcasted ${event} (took ${duration}ms)`)

    return true
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[RealtimeChannels] ❌ Failed to broadcast ${event} after ${duration}ms:`, error)

    // Don't throw - broadcasting is a nice-to-have, not critical
    // Postgres changes listener will catch it as fallback
    return false
  }
}

/**
 * Close all persistent channels (for graceful shutdown)
 * Typically only used in tests or server shutdown
 */
export async function closeAllChannels() {
  if (sessionAssignmentsChannel) {
    try {
      await sessionAssignmentsChannel.unsubscribe()
      supabaseAdmin.removeChannel(sessionAssignmentsChannel)
      console.log('[RealtimeChannels] Closed session_assignments_feed channel')
    } catch (error) {
      console.error('[RealtimeChannels] Error closing channel:', error)
    } finally {
      sessionAssignmentsChannel = null
      sessionAssignmentsChannelStatus = 'disconnected'
    }
  }
}

/**
 * Get channel status for monitoring/debugging
 */
export function getChannelStatus() {
  return {
    sessionAssignmentsChannel: {
      status: sessionAssignmentsChannelStatus,
      connected: sessionAssignmentsChannelStatus === 'connected',
    },
  }
}

// ============================================================================
// DEPRECATED - OLD SESSION_REQUESTS SYSTEM
// ============================================================================
// The following functions are deprecated and maintained only for backward compatibility.
// All new code should use broadcastSessionAssignment() instead.
// ============================================================================

/**
 * @deprecated Use broadcastSessionAssignment() instead
 * This is maintained for backward compatibility only.
 */
export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  console.warn('[RealtimeChannels] ⚠️ broadcastSessionRequest is deprecated. Use broadcastSessionAssignment instead.')

  // Map old events to new events
  const eventMap: Record<string, 'new_assignment' | 'assignment_accepted' | 'assignment_cancelled'> = {
    'new_request': 'new_assignment',
    'request_accepted': 'assignment_accepted',
    'request_cancelled': 'assignment_cancelled'
  }

  return broadcastSessionAssignment(eventMap[event], payload)
}

/**
 * @deprecated Use getSessionAssignmentsChannel() instead
 */
export async function getSessionRequestsChannel() {
  console.warn('[RealtimeChannels] ⚠️ getSessionRequestsChannel is deprecated. Use getSessionAssignmentsChannel instead.')
  return getSessionAssignmentsChannel()
}
