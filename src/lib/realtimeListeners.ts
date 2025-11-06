/**
 * Browser-only Realtime Listeners
 *
 * CRITICAL: These listeners MUST run in the browser, never on the server.
 * Server-side subscriptions die when serverless functions terminate on Render.
 *
 * Usage: Import these in 'use client' components that stay mounted
 */

'use client'

import { supabaseBrowser } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SessionAssignmentEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
  schema: string
  table: string
}

/**
 * Listen to session_assignments table changes (INSERT, UPDATE, DELETE)
 *
 * This is the PRIMARY mechanism for mechanics to receive new session requests.
 * When a waiver is signed, an assignment is INSERTed with status='queued',
 * triggering this listener.
 *
 * @param onEvent - Callback fired when assignment changes
 * @returns Cleanup function to call on component unmount
 *
 * @example
 * useEffect(() => {
 *   const cleanup = listenSessionAssignments((event) => {
 *     if (event.eventType === 'INSERT' && event.new.status === 'queued') {
 *       // New assignment! Show alert and refetch queue
 *       refetchQueue()
 *     }
 *   })
 *   return cleanup
 * }, [])
 */
export function listenSessionAssignments(
  onEvent: (event: SessionAssignmentEvent) => void
): () => void {
  const client = supabaseBrowser()

  console.log('[realtimeListeners] 🔌 Setting up session_assignments listener...')

  const channel = client
    .channel('session-assignments-listener')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_assignments',
      },
      (payload) => {
        console.log('[realtimeListeners] 📨 session_assignments event:', {
          eventType: payload.eventType,
          newStatus: (payload.new as any)?.status,
          oldStatus: (payload.old as any)?.status,
          assignmentId: (payload.new as any)?.id || (payload.old as any)?.id
        })

        onEvent({
          eventType: payload.eventType?.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
          schema: payload.schema,
          table: payload.table
        })
      }
    )
    .subscribe((status) => {
      console.log('[realtimeListeners] session_assignments subscription status:', status)

      if (status === 'SUBSCRIBED') {
        console.log('[realtimeListeners] ✅ Successfully subscribed to session_assignments')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error('[realtimeListeners] ❌ Subscription failed:', status)
      }
    })

  // Return cleanup function
  return () => {
    console.log('[realtimeListeners] 🔌 Cleaning up session_assignments listener')
    client.removeChannel(channel)
  }
}

/**
 * Listen to sessions table changes (status transitions)
 *
 * @param onEvent - Callback fired when session changes
 * @returns Cleanup function to call on component unmount
 */
export function listenSessions(
  onEvent: (event: SessionAssignmentEvent) => void
): () => void {
  const client = supabaseBrowser()

  console.log('[realtimeListeners] 🔌 Setting up sessions listener...')

  const channel = client
    .channel('sessions-listener')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
      },
      (payload) => {
        console.log('[realtimeListeners] 📨 sessions event:', {
          eventType: payload.eventType,
          newStatus: (payload.new as any)?.status,
          oldStatus: (payload.old as any)?.status,
          sessionId: (payload.new as any)?.id || (payload.old as any)?.id
        })

        onEvent({
          eventType: payload.eventType?.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
          schema: payload.schema,
          table: payload.table
        })
      }
    )
    .subscribe((status) => {
      console.log('[realtimeListeners] sessions subscription status:', status)

      if (status === 'SUBSCRIBED') {
        console.log('[realtimeListeners] ✅ Successfully subscribed to sessions')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error('[realtimeListeners] ❌ Subscription failed:', status)
      }
    })

  // Return cleanup function
  return () => {
    console.log('[realtimeListeners] 🔌 Cleaning up sessions listener')
    client.removeChannel(channel)
  }
}

/**
 * Listen to repair_quotes table changes
 *
 * @param onEvent - Callback fired when quote changes
 * @returns Cleanup function to call on component unmount
 */
export function listenRepairQuotes(
  onEvent: (event: SessionAssignmentEvent) => void
): () => void {
  const client = supabaseBrowser()

  console.log('[realtimeListeners] 🔌 Setting up repair_quotes listener...')

  const channel = client
    .channel('repair-quotes-listener')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'repair_quotes',
      },
      (payload) => {
        console.log('[realtimeListeners] 📨 repair_quotes event:', payload.eventType)

        onEvent({
          eventType: payload.eventType?.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
          schema: payload.schema,
          table: payload.table
        })
      }
    )
    .subscribe((status) => {
      console.log('[realtimeListeners] repair_quotes subscription status:', status)
    })

  // Return cleanup function
  return () => {
    console.log('[realtimeListeners] 🔌 Cleaning up repair_quotes listener')
    client.removeChannel(channel)
  }
}

/**
 * Combined listener for mechanic dashboard
 * Subscribes to all relevant tables in a single channel
 *
 * @param callbacks - Object with callbacks for each table
 * @returns Cleanup function
 */
export function listenMechanicDashboard(callbacks: {
  onSessionAssignment?: (event: SessionAssignmentEvent) => void
  onSession?: (event: SessionAssignmentEvent) => void
  onQuote?: (event: SessionAssignmentEvent) => void
}): () => void {
  const cleanups: Array<() => void> = []

  if (callbacks.onSessionAssignment) {
    cleanups.push(listenSessionAssignments(callbacks.onSessionAssignment))
  }

  if (callbacks.onSession) {
    cleanups.push(listenSessions(callbacks.onSession))
  }

  if (callbacks.onQuote) {
    cleanups.push(listenRepairQuotes(callbacks.onQuote))
  }

  // Return combined cleanup
  return () => {
    cleanups.forEach(cleanup => cleanup())
  }
}
