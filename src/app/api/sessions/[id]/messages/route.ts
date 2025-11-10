import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/sessions/[id]/messages
 * Fetches all chat messages for a session
 * Used by PDF report generator and other components
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${sessionId}/messages] ${participant.role} accessing messages`)

  try {
    // Fetch session to get participant names
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        customer_user_id,
        mechanic_id,
        customer:profiles!customer_user_id (
          full_name
        ),
        mechanic:mechanics!mechanic_id (
          id,
          user_id,
          name,
          mechanic_profile:profiles!user_id (
            full_name
          )
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch all chat messages for this session
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[Get Messages] Error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Enrich messages with sender information
    // Note: mechanic_id in sessions table is the mechanics.id (UUID)
    // But sender_id in chat_messages is auth.users.id (UUID)
    // We need to match using the mechanic's user_id from the mechanics table
    const mechanicUserId = (session as any).mechanic?.user_id || null

    const enrichedMessages = messages?.map((msg: any) => {
      // Check if sender is the mechanic by comparing with mechanic's user_id
      const isMechanic = mechanicUserId && msg.sender_id === mechanicUserId
      const senderRole = isMechanic ? 'mechanic' : 'customer'

      let senderName = 'Unknown'
      if (isMechanic) {
        senderName = (session as any).mechanic?.name ||
                     (session as any).mechanic?.mechanic_profile?.full_name ||
                     'Mechanic'
      } else {
        senderName = (session as any).customer?.full_name || 'Customer'
      }

      return {
        ...msg,
        sender_role: senderRole,
        sender_name: senderName,
      }
    }) || []

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      session_type: (session as any).type,
      message_count: enrichedMessages.length,
      messages: enrichedMessages,
    })
  } catch (error: any) {
    console.error('[Get Messages] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
