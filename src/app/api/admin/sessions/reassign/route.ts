// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  validateMechanicExists,
  validateSessionParticipantReferences,
  ForeignKeyValidationError
} from '@/lib/validation/foreignKeyValidator'

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

    // Phase 3.2: Validate foreign keys before reassigning
    try {
      await validateMechanicExists(mechanicId)
    } catch (error) {
      if (error instanceof ForeignKeyValidationError) {
        return NextResponse.json(
          { error: `Mechanic validation failed: ${error.message}` },
          { status: 404 }
        )
      }
      throw error
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

    // Phase 3.2: Validate session participant references before insert
    try {
      await validateSessionParticipantReferences({
        sessionId,
        userId: mechanicId
      })
    } catch (error) {
      if (error instanceof ForeignKeyValidationError) {
        return NextResponse.json(
          { error: `Session participant validation failed: ${error.message}` },
          { status: 400 }
        )
      }
      throw error
    }

    // Add new mechanic to participants
    const { error: participantError } = await supabaseAdmin.from('session_participants').insert({
      session_id: sessionId,
      user_id: mechanicId,
      role: 'mechanic',
      metadata: {
        assigned_by_admin: true,
        assigned_by: auth.user!.id,
        assigned_at: new Date().toISOString(),
      },
    })

    if (participantError) {
      console.error('[Admin] Failed to add session participant:', participantError)
      return NextResponse.json(
        { error: `Failed to add mechanic to session: ${participantError.message}` },
        { status: 500 }
      )
    }

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
