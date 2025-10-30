// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    const body = await request.json()
    const { sessionIds, reason } = body

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ error: 'Session IDs are required' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Get all sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, metadata')
      .in('id', sessionIds)

    if (sessionsError) {
      throw sessionsError
    }

    // Filter sessions that can be cancelled
    const cancellableSessions = sessions?.filter(
      (s) => s.status !== 'cancelled' && s.status !== 'completed'
    )

    if (!cancellableSessions || cancellableSessions.length === 0) {
      return NextResponse.json(
        { error: 'No cancellable sessions found' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // Update all sessions
    const updates = cancellableSessions.map((session) => ({
      id: session.id,
      status: 'cancelled',
      ended_at: timestamp,
      metadata: {
        ...(session.metadata as any || {}),
        cancellation_reason: reason,
        cancelled_by_admin: true,
        cancelled_by: admin.id,
        cancelled_at: timestamp,
        bulk_cancellation: true,
      },
    }))

    // Batch update
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .upsert(updates as any, { onConflict: 'id' })

    if (updateError) {
      throw updateError
    }

    // Log the action
    console.warn(`[ADMIN ACTION] ${admin.email} bulk-cancelled ${cancellableSessions.length} sessions`)
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: admin.id,
      action: 'bulk_cancel_sessions',
      target_type: 'session',
      target_id: null,
      details: {
        session_ids: cancellableSessions.map((s) => s.id),
        count: cancellableSessions.length,
        reason,
      },
    })

    return NextResponse.json({
      success: true,
      cancelled_count: cancellableSessions.length,
      skipped_count: sessionIds.length - cancellableSessions.length,
    })
  } catch (error: any) {
    console.error('Error bulk cancelling sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to bulk cancel sessions' },
      { status: 500 }
    )
  }
}
