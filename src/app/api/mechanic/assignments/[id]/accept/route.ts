import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'

/**
 * POST /api/mechanic/assignments/:id/accept
 * Mechanic accepts a session assignment
 *
 * Flow:
 * 1. Verify mechanic is authenticated
 * 2. Verify assignment belongs to mechanic
 * 3. Update assignment status to 'accepted'
 * 4. Update session status to 'waiting' (if still 'pending')
 * 5. Log session event
 * 6. Return session details for redirect
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assignmentId } = params

    // Create Supabase client with cookies for auth
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {}
        }
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic record from mechanics table and profile from profiles table
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      console.error('[Accept Assignment] Mechanic not found:', mechanicError)
      return NextResponse.json(
        { error: 'Mechanic profile not found' },
        { status: 404 }
      )
    }

    // Get mechanic name from profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const mechanicName = profile?.full_name || 'Unknown Mechanic'

    // Get assignment with session details
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('session_assignments')
      .select(`
        id,
        session_id,
        mechanic_id,
        status,
        sessions (
          id,
          type,
          status,
          customer_user_id
        )
      `)
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify assignment can be accepted by this mechanic
    // For broadcast assignments (mechanic_id is NULL), any mechanic can accept
    // For direct assignments (mechanic_id is set), only that mechanic can accept
    if (assignment.mechanic_id !== null && assignment.mechanic_id !== mechanic.id) {
      return NextResponse.json(
        { error: 'This assignment does not belong to you' },
        { status: 403 }
      )
    }

    // Verify assignment is queued (available to accept)
    if (assignment.status !== 'queued') {
      return NextResponse.json(
        { error: `Assignment already ${assignment.status}` },
        { status: 409 }
      )
    }

    const session = assignment.sessions as any

    // Update assignment status to accepted and set mechanic_id
    const { error: updateAssignmentError } = await supabaseAdmin
      .from('session_assignments')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        mechanic_id: mechanic.id  // Assign the mechanic to this session
      })
      .eq('id', assignmentId)

    if (updateAssignmentError) {
      console.error('[Accept Assignment] Failed to update assignment:', updateAssignmentError)
      return NextResponse.json(
        { error: 'Failed to accept assignment' },
        { status: 500 }
      )
    }

    // Update session with mechanic_id and status
    // Set status to 'waiting' if still 'pending', and always set mechanic_id
    const sessionUpdate: any = {
      mechanic_id: mechanic.id
    }

    if (session.status === 'pending') {
      sessionUpdate.status = 'waiting'
    }

    const { error: updateSessionError } = await supabaseAdmin
      .from('sessions')
      .update(sessionUpdate)
      .eq('id', assignment.session_id)

    if (updateSessionError) {
      console.error('[Accept Assignment] Failed to update session:', updateSessionError)
      return NextResponse.json(
        { error: 'Failed to assign mechanic to session' },
        { status: 500 }
      )
    }

    // Log session event
    await supabaseAdmin.from('session_events').insert({
      session_id: assignment.session_id,
      event_type: 'assigned',
      user_id: user.id,
      mechanic_id: mechanic.id,
      metadata: {
        assignment_id: assignmentId,
        mechanic_name: mechanicName,
        auto_assigned: false
      }
    })

    // Return success with session details
    return NextResponse.json({
      success: true,
      sessionId: assignment.session_id,
      sessionType: session.type,
      message: 'Assignment accepted successfully'
    })

  } catch (error) {
    console.error('[Accept Assignment] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
