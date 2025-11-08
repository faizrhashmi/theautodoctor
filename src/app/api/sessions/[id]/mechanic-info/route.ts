import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/sessions/[id]/mechanic-info
 *
 * Fetch mechanic name and user_id for a session.
 * Used by video/chat pages to update mechanic name in real-time when mechanic joins.
 *
 * This endpoint uses admin client to bypass RLS since customers don't have
 * permission to read from mechanics table directly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    // Fetch session to get mechanic_id
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('mechanic_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session.mechanic_id) {
      return NextResponse.json({
        mechanicAssigned: false,
        name: null,
        user_id: null
      })
    }

    // Fetch mechanic info
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, user_id')
      .eq('id', session.mechanic_id)
      .maybeSingle()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    return NextResponse.json({
      mechanicAssigned: true,
      id: mechanic.id,
      name: mechanic.name,
      user_id: mechanic.user_id,
    })
  } catch (error) {
    console.error('[MECHANIC INFO API] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
