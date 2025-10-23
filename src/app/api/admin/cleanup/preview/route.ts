// @ts-nocheck
// src/app/api/admin/cleanup/preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_request: NextRequest) {
  try {
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Find expired requests (pending for more than 15 minutes)
    const { data: expiredRequests, error: expiredError } = await supabase
      .from('session_requests')
      .select('id, customer_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', fifteenMinutesAgo.toISOString())

    if (expiredError) throw expiredError

    // Find old waiting sessions (waiting for more than 1 hour)
    const { data: oldWaitingSessions, error: waitingError } = await supabase
      .from('sessions')
      .select('id, customer_id, created_at')
      .eq('status', 'waiting')
      .lt('created_at', oneHourAgo.toISOString())

    if (waitingError) throw waitingError

    // Find orphaned sessions (active but no corresponding LiveKit room)
    const { data: activeSessions, error: activeError } = await supabase
      .from('sessions')
      .select('id, room_name, created_at')
      .eq('status', 'active')

    if (activeError) throw activeError

    // For preview, we'll assume some might be orphaned
    // In real implementation, you'd check LiveKit API
    const potentialOrphans = activeSessions?.filter(session => {
      const createdAt = new Date(session.created_at)
      const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      return ageInHours > 2 // Sessions active for more than 2 hours might be orphaned
    }) || []

    const preview = {
      expiredRequests: {
        count: expiredRequests?.length || 0,
        items: expiredRequests?.map(r => ({
          id: r.id,
          customer_id: r.customer_id,
          age_minutes: Math.floor((now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60)),
        })) || [],
      },
      oldWaitingSessions: {
        count: oldWaitingSessions?.length || 0,
        items: oldWaitingSessions?.map(s => ({
          id: s.id,
          customer_id: s.customer_id,
          age_hours: Math.floor((now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60)),
        })) || [],
      },
      potentialOrphans: {
        count: potentialOrphans.length,
        items: potentialOrphans.map(s => ({
          id: s.id,
          room_name: s.room_name,
          age_hours: Math.floor((now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60)),
        })),
      },
      total: (expiredRequests?.length || 0) + (oldWaitingSessions?.length || 0) + potentialOrphans.length,
    }

    return NextResponse.json(preview)
  } catch (error: any) {
    console.error('Error generating cleanup preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate cleanup preview', message: error.message },
      { status: 500 }
    )
  }
}
