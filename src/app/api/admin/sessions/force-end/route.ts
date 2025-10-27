// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY FIX: Require admin authentication
    const auth = await requireAdmin(request)
    if (!auth.authorized) {
      return auth.response!
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Get current session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Session is already ended' },
        { status: 400 }
      )
    }

    // Calculate duration if started
    let durationMinutes = session.duration_minutes
    if (session.started_at && !durationMinutes) {
      const startTime = new Date(session.started_at).getTime()
      const endTime = Date.now()
      durationMinutes = Math.round((endTime - startTime) / 60000)
    }

    // Update session status
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        metadata: {
          ...(session.metadata as any || {}),
          force_ended_by_admin: true,
          force_ended_by: user.id,
          force_ended_at: new Date().toISOString(),
        },
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Log the action
    console.warn(
      `[ADMIN ACTION] ${auth.profile?.full_name} force-ended session ${sessionId}`
    )

    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: auth.user!.id,
      action: 'force_end_session',
      target_type: 'session',
      target_id: sessionId,
      details: {
        duration_minutes: durationMinutes,
        admin_name: auth.profile?.full_name || auth.profile?.email
      },
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })
  } catch (error: any) {
    console.error('Error ending session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to end session' },
      { status: 500 }
    )
  }
}
