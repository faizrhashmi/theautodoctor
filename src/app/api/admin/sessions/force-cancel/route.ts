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
    const { sessionId, reason } = body

    if (!sessionId || !reason) {
      return NextResponse.json(
        { error: 'Session ID and reason are required' },
        { status: 400 }
      )
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

    if (session.status === 'cancelled' || session.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled session' },
        { status: 400 }
      )
    }

    // Update session status
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata as any || {}),
          cancellation_reason: reason,
          cancelled_by_admin: true,
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
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
      `[ADMIN ACTION] ${auth.profile?.full_name} force-cancelled session ${sessionId} - Reason: ${reason}`
    )

    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: auth.user!.id,
      action: 'force_cancel_session',
      target_type: 'session',
      target_id: sessionId,
      details: {
        reason,
        admin_name: auth.profile?.full_name || auth.profile?.email
      },
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })
  } catch (error: any) {
    console.error('Error cancelling session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel session' },
      { status: 500 }
    )
  }
}
