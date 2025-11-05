import { supabaseAdmin } from './supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'

/**
 * Check if a session has expired based on its plan duration
 * and auto-expire it if needed
 */
export async function checkAndExpireSession(sessionId: string) {
  try {
    // Fetch session
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('id, plan, type, status, started_at, created_at, metadata')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return { expired: false, session: null }
    }

    // Skip if already completed or cancelled
    if (session.status === 'completed' || session.status === 'cancelled') {
      return { expired: true, session }
    }

    // Skip if not started yet
    if (!session.started_at) {
      return { expired: false, session }
    }

    const planKey = (session.plan as PlanKey) || 'video15'
    const planConfig = PRICING[planKey]

    if (!planConfig) {
      console.error(`Unknown plan ${planKey} for session ${sessionId}`)
      return { expired: false, session }
    }

    // Get base duration + extensions
    let totalDurationMinutes = planConfig.duration

    if (session.metadata && typeof session.metadata === 'object') {
      const metadata = session.metadata as any
      if (metadata.extended_duration) {
        totalDurationMinutes = metadata.extended_duration
      } else if (metadata.extensions && Array.isArray(metadata.extensions)) {
        const extensionMinutes = metadata.extensions.reduce(
          (sum: number, ext: any) => sum + (ext.minutes || 0),
          0
        )
        totalDurationMinutes += extensionMinutes
      }
    }

    // Calculate expected end time
    const startTime = new Date(session.started_at)
    const expectedEndTime = new Date(startTime.getTime() + totalDurationMinutes * 60 * 1000)
    const now = new Date()

    // Check if session has expired
    if (now >= expectedEndTime) {
      console.log(`[Session Expiration] Session ${sessionId} has expired`, {
        plan: planKey,
        totalDurationMinutes,
        startTime: startTime.toISOString(),
        expectedEndTime: expectedEndTime.toISOString(),
        currentTime: now.toISOString(),
      })

      // Mark session as completed
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: now.toISOString(),
          metadata: {
            ...(typeof session.metadata === 'object' ? session.metadata : {}),
            auto_expired: true,
            auto_expired_reason: 'duration_elapsed',
            auto_expired_at: now.toISOString(),
            planned_end_time: expectedEndTime.toISOString(),
          },
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (updateError) {
        console.error(`Failed to update session ${sessionId}:`, updateError)
        return { expired: false, session }
      }

      // Broadcast session:ended event
      const channelName = session.type === 'chat' ? `session-${sessionId}` : `session:${sessionId}`

      try {
        await supabaseAdmin.channel(channelName).send({
          type: 'broadcast',
          event: 'session:ended',
          payload: {
            sessionId,
            status: 'completed',
            ended_at: now.toISOString(),
            reason: 'auto_expired_duration_elapsed',
          },
        })
      } catch (broadcastError) {
        console.error(`Failed to broadcast for ${sessionId}:`, broadcastError)
      }

      // Insert session event for audit trail
      try {
        await supabaseAdmin.from('session_events').insert({
          session_id: sessionId,
          event_type: 'session_auto_expired',
          event_data: {
            plan: planKey,
            duration_minutes: totalDurationMinutes,
            expected_end_time: expectedEndTime.toISOString(),
          },
          user_id: null,
          user_role: 'system',
          created_at: now.toISOString(),
        })
      } catch (eventError) {
        console.error(`Failed to log event for ${sessionId}:`, eventError)
      }

      return { expired: true, session: updatedSession }
    }

    return { expired: false, session }
  } catch (error) {
    console.error('[Session Expiration] Error:', error)
    return { expired: false, session: null }
  }
}
