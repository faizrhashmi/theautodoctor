import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING, type PlanKey } from '@/config/pricing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron job to auto-expire sessions based on their plan duration
 * Runs every minute to check for expired sessions
 *
 * This ensures sessions are marked as completed even if users disconnect
 * and don't manually end the session
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = {
      expired_sessions: 0,
      errors: [] as string[],
      details: [] as any[],
    }

    // Fetch all active sessions (not already completed/cancelled)
    const { data: activeSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, plan, type, status, started_at, created_at, metadata')
      .in('status', ['pending', 'waiting', 'accepted', 'live', 'in_progress', 'reconnecting'])
      .not('started_at', 'is', null) // Only sessions that have actually started

    if (fetchError) {
      throw new Error(`Failed to fetch active sessions: ${fetchError.message}`)
    }

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        message: 'No active sessions to check',
        results,
      })
    }

    console.log(`[Cron Expire Sessions] Checking ${activeSessions.length} active sessions`)

    // Check each session
    for (const session of activeSessions) {
      try {
        const planKey = (session.plan as PlanKey) || 'video15'
        const planConfig = PRICING[planKey]

        if (!planConfig) {
          results.errors.push(`Unknown plan ${planKey} for session ${session.id}`)
          continue
        }

        // Get base duration in minutes
        let totalDurationMinutes = planConfig.duration

        // Add any time extensions from metadata
        if (session.metadata && typeof session.metadata === 'object') {
          const metadata = session.metadata as any
          if (metadata.extended_duration) {
            totalDurationMinutes = metadata.extended_duration
          } else if (metadata.extensions && Array.isArray(metadata.extensions)) {
            // Sum up all extensions
            const extensionMinutes = metadata.extensions.reduce(
              (sum: number, ext: any) => sum + (ext.minutes || 0),
              0
            )
            totalDurationMinutes += extensionMinutes
          }
        }

        // Calculate expected end time
        const startTime = new Date(session.started_at!)
        const expectedEndTime = new Date(startTime.getTime() + totalDurationMinutes * 60 * 1000)

        // Check if session has expired
        if (now >= expectedEndTime) {
          console.log(`[Cron Expire Sessions] Session ${session.id} has expired`, {
            plan: planKey,
            totalDurationMinutes,
            startTime: startTime.toISOString(),
            expectedEndTime: expectedEndTime.toISOString(),
            currentTime: now.toISOString(),
          })

          // Mark session as completed
          const { error: updateError } = await supabaseAdmin
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
            .eq('id', session.id)

          if (updateError) {
            throw new Error(`Failed to update session ${session.id}: ${updateError.message}`)
          }

          // Broadcast session:ended event to all connected clients
          // Use correct channel name format based on session type
          const channelName = session.type === 'chat'
            ? `session-${session.id}`
            : `session:${session.id}`

          try {
            await supabaseAdmin.channel(channelName).send({
              type: 'broadcast',
              event: 'session:ended',
              payload: {
                sessionId: session.id,
                status: 'completed',
                ended_at: now.toISOString(),
                reason: 'auto_expired_duration_elapsed',
              },
            })
            console.log(`[Cron Expire Sessions] Broadcast sent to ${channelName}`)
          } catch (broadcastError: any) {
            console.error(`[Cron Expire Sessions] Failed to broadcast for ${session.id}:`, broadcastError)
            // Don't fail the whole operation if broadcast fails
          }

          results.expired_sessions++
          results.details.push({
            sessionId: session.id,
            plan: planKey,
            type: session.type,
            durationMinutes: totalDurationMinutes,
            startedAt: startTime.toISOString(),
            expiredAt: now.toISOString(),
          })

          console.log(`[Cron Expire Sessions] ✅ Successfully expired session ${session.id}`)
        }
      } catch (err: any) {
        const errorMsg = `Failed to process session ${session.id}: ${err.message}`
        console.error(`[Cron Expire Sessions] ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log(`[Cron Expire Sessions] Completed. Expired ${results.expired_sessions} sessions`)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('[Cron Expire Sessions] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
