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

// Persistent channel for broadcasting session request updates
let sessionRequestsChannel: any = null
let sessionRequestsChannelStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'

/**
 * Get or create the persistent session_requests_feed broadcast channel
 *
 * This channel is used to notify mechanics of new session requests,
 * accepted requests, and cancelled requests in real-time.
 */
export async function getSessionRequestsChannel() {
  // Return existing connected channel
  if (sessionRequestsChannel && sessionRequestsChannelStatus === 'connected') {
    return sessionRequestsChannel
  }

  // If currently connecting, wait for connection
  if (sessionRequestsChannelStatus === 'connecting') {
    return new Promise<any>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (sessionRequestsChannelStatus === 'connected' && sessionRequestsChannel) {
          clearInterval(checkInterval)
          resolve(sessionRequestsChannel)
        } else if (sessionRequestsChannelStatus === 'error') {
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
  sessionRequestsChannelStatus = 'connecting'
  sessionRequestsChannel = supabaseAdmin.channel('session_requests_feed', {
    config: {
      broadcast: { self: false }, // Don't receive own broadcasts
    },
  })

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        sessionRequestsChannelStatus = 'error'
        reject(new Error('Channel subscription timeout after 5 seconds'))
      }, 5000)

      sessionRequestsChannel.subscribe((status: string, err: any) => {
        console.log(`[RealtimeChannels] session_requests_feed status: ${status}`)

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          sessionRequestsChannelStatus = 'connected'
          console.log('[RealtimeChannels] ✅ session_requests_feed channel ready')
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout)
          sessionRequestsChannelStatus = 'error'
          console.error('[RealtimeChannels] ❌ Channel subscription failed:', status, err)
          reject(err || new Error(`Channel subscription failed: ${status}`))
        }
      })
    })

    return sessionRequestsChannel
  } catch (error) {
    // Reset state on error so next attempt can try again
    sessionRequestsChannelStatus = 'disconnected'
    sessionRequestsChannel = null
    throw error
  }
}

/**
 * Broadcast a session request event to all listening mechanics
 *
 * @param event - The type of event (new_request, request_accepted, request_cancelled)
 * @param payload - The event payload containing request details
 *
 * This uses a persistent channel to avoid race conditions where broadcasts
 * are lost due to premature channel closure.
 */
export async function broadcastSessionRequest(
  event: 'new_request' | 'request_accepted' | 'request_cancelled',
  payload: Record<string, unknown>
) {
  const startTime = Date.now()

  try {
    console.log(`[RealtimeChannels] 📡 Preparing to broadcast ${event}...`)

    const channel = await getSessionRequestsChannel()

    console.log(`[RealtimeChannels] Broadcasting ${event} with payload:`, {
      requestId: (payload.request as any)?.id?.substring(0, 8),
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
  if (sessionRequestsChannel) {
    try {
      await sessionRequestsChannel.unsubscribe()
      supabaseAdmin.removeChannel(sessionRequestsChannel)
      console.log('[RealtimeChannels] Closed session_requests_feed channel')
    } catch (error) {
      console.error('[RealtimeChannels] Error closing channel:', error)
    } finally {
      sessionRequestsChannel = null
      sessionRequestsChannelStatus = 'disconnected'
    }
  }
}

/**
 * Get channel status for monitoring/debugging
 */
export function getChannelStatus() {
  return {
    sessionRequestsChannel: {
      status: sessionRequestsChannelStatus,
      connected: sessionRequestsChannelStatus === 'connected',
    },
  }
}
