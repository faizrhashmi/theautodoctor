// @ts-nocheck
// src/app/api/admin/cleanup/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/adminLogger'
import { requireAdmin } from '@/lib/auth/requireAdmin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY FIX: Require admin authentication
    const auth = await requireAdmin(request)
    if (!auth.authorized) {
      return auth.response!
    }

    console.warn(
      `[SECURITY] Admin ${auth.profile?.full_name} executing cleanup`
    )

    const body = await request.json()
    const { dryRun = false } = body

    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    let expiredRequestsCount = 0
    let oldWaitingSessionsCount = 0
    let orphanedSessionsCount = 0

    // 1. Cancel expired session requests
    const { data: expiredRequests } = await supabase
      .from('session_requests')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', fifteenMinutesAgo.toISOString())

    if (expiredRequests && expiredRequests.length > 0 && !dryRun) {
      const { error } = await supabase
        .from('session_requests')
        .update({ status: 'expired' })
        .in('id', expiredRequests.map(r => r.id))

      if (!error) {
        expiredRequestsCount = expiredRequests.length
        await logger.logCleanupEvent('Expired session requests cancelled', {
          count: expiredRequestsCount,
          requestIds: expiredRequests.map(r => r.id),
        })
      }
    } else if (expiredRequests) {
      expiredRequestsCount = expiredRequests.length
    }

    // 2. Cancel old waiting sessions
    const { data: oldWaitingSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('status', 'waiting')
      .lt('created_at', oneHourAgo.toISOString())

    if (oldWaitingSessions && oldWaitingSessions.length > 0 && !dryRun) {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled', ended_at: now.toISOString() })
        .in('id', oldWaitingSessions.map(s => s.id))

      if (!error) {
        oldWaitingSessionsCount = oldWaitingSessions.length
        await logger.logCleanupEvent('Old waiting sessions cancelled', {
          count: oldWaitingSessionsCount,
          sessionIds: oldWaitingSessions.map(s => s.id),
        })
      }
    } else if (oldWaitingSessions) {
      oldWaitingSessionsCount = oldWaitingSessions.length
    }

    // 3. Handle orphaned sessions (active sessions without LiveKit rooms)
    // For now, we'll just identify them - you'd need to integrate with LiveKit API
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('id, created_at')
      .eq('status', 'active')

    const potentialOrphans = activeSessions?.filter(session => {
      const createdAt = new Date(session.created_at)
      const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      return ageInHours > 2
    }) || []

    if (potentialOrphans.length > 0 && !dryRun) {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'error', ended_at: now.toISOString() })
        .in('id', potentialOrphans.map(s => s.id))

      if (!error) {
        orphanedSessionsCount = potentialOrphans.length
        await logger.logCleanupEvent('Orphaned sessions cleaned', {
          count: orphanedSessionsCount,
          sessionIds: potentialOrphans.map(s => s.id),
        })
      }
    } else {
      orphanedSessionsCount = potentialOrphans.length
    }

    const totalCleaned = expiredRequestsCount + oldWaitingSessionsCount + orphanedSessionsCount

    // Save cleanup history
    if (!dryRun && totalCleaned > 0) {
      await supabase.from('cleanup_history').insert({
        cleanup_type: 'manual',
        items_cleaned: totalCleaned,
        preview_mode: false,
        triggered_by: 'admin',
        summary: {
          expiredRequests: expiredRequestsCount,
          oldWaitingSessions: oldWaitingSessionsCount,
          orphanedSessions: orphanedSessionsCount,
        },
      })
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        expiredRequests: expiredRequestsCount,
        oldWaitingSessions: oldWaitingSessionsCount,
        orphanedSessions: orphanedSessionsCount,
        totalCleaned,
      },
    })
  } catch (error: any) {
    await logger.error('cleanup', 'Cleanup execution failed', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { error: 'Cleanup execution failed', message: error.message },
      { status: 500 }
    )
  }
}
