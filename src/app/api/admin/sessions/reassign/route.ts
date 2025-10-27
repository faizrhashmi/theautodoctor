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
    const { sessionId, mechanicId } = body

    if (!sessionId || !mechanicId) {
      return NextResponse.json(
        { error: 'Session ID and mechanic ID are required' },
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

    // Verify mechanic exists
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('users' as any)
      .select('id, user_metadata')
      .eq('id', mechanicId)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Check if mechanic role
    const userMetadata = (mechanic as any)?.user_metadata
    if (userMetadata?.role !== 'mechanic') {
      return NextResponse.json(
        { error: 'User is not a mechanic' },
        { status: 400 }
      )
    }

    const oldMechanicId = session.mechanic_id

    // Update session mechanic
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        mechanic_id: mechanicId,
        metadata: {
          ...(session.metadata as any || {}),
          reassigned_by_admin: true,
          reassigned_by: user.id,
          reassigned_at: new Date().toISOString(),
          previous_mechanic_id: oldMechanicId,
        },
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Remove old mechanic from participants if exists
    if (oldMechanicId) {
      await supabaseAdmin
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', oldMechanicId)
        .eq('role', 'mechanic')
    }

    // Add new mechanic to participants
    await supabaseAdmin.from('session_participants').insert({
      session_id: sessionId,
      user_id: mechanicId,
      role: 'mechanic',
      metadata: {
        assigned_by_admin: true,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      },
    })

    // Log the action
    console.warn(
      `[ADMIN ACTION] ${auth.profile?.full_name} reassigned session ${sessionId} from ${oldMechanicId} to ${mechanicId}`
    )

    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: auth.user!.id,
      action: 'reassign_session',
      target_type: 'session',
      target_id: sessionId,
      details: {
        old_mechanic_id: oldMechanicId,
        new_mechanic_id: mechanicId,
        admin_name: auth.profile?.full_name || auth.profile?.email
      },
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
    })
  } catch (error: any) {
    console.error('Error reassigning session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reassign session' },
      { status: 500 }
    )
  }
}
