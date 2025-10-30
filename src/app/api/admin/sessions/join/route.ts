// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    console.warn(
      `[ADMIN ACTION] Admin ${admin.email} joining session`
    )

    const body = await req.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify the session exists and is available
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, type, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if a mechanic is already assigned
    const { data: existingMechanic, error: checkError } = await supabaseAdmin
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('role', 'mechanic')
      .maybeSingle()

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existingMechanic) {
      return NextResponse.json(
        { error: 'A mechanic has already joined this session' },
        { status: 409 }
      )
    }

    // Add the admin as a participant (using service role to bypass RLS)
    const { error: insertError } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: sessionId,
        user_id: admin.id,
        role: 'mechanic', // Admin joins as mechanic role
        metadata: {
          is_admin: true,
          admin_name: admin.email || admin.email
        }
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update session status to active
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to update session status:', updateError)
      // Don't fail the request, status update is optional
    }

    return NextResponse.json({
      success: true,
      sessionId,
      type: session.type,
    })
  } catch (error: any) {
    console.error('[admin/sessions/join] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
