import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[DELETE /sessions/${sessionId}/delete] ${participant.role} attempting to delete session ${participant.sessionId}`)

  // Only customers can delete sessions (business rule)
  if (participant.role !== 'customer') {
    return NextResponse.json({ error: 'Only session owners can delete sessions' }, { status: 403 })
  }

  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Not needed for DELETE request
          },
        },
      }
    )

    // Verify the session status before deletion
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('id, status, customer_user_id')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only allow deletion of completed or canceled sessions
    const status = session.status.toLowerCase()
    if (status === 'live' || status === 'waiting' || status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete active or pending sessions. Please cancel or complete the session first.' },
        { status: 400 }
      )
    }

    // Delete the session (cascading deletes will handle related records)
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
