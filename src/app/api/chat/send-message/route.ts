import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Helper to check mechanic auth using unified Supabase auth
async function getMechanicFromAuth() {
  const supabase = getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return mechanic
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, content, attachments, tempId } = await req.json()

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    const mechanic = await getMechanicFromAuth()

    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        customer_user_id,
        mechanic_id,
        mechanics(user_id)
      `)
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const mechanicUserId = session.mechanics?.user_id || null
    let senderId: string | null = null

    if (mechanic && session.mechanic_id === mechanic.id) {
      senderId = mechanic.user_id
      console.log('[send-message] Sender identified as MECHANIC:', senderId, '(mechanic.id:', mechanic.id, ')')
    } else if (user && session.customer_user_id === user.id) {
      senderId = user.id
      console.log('[send-message] Sender identified as CUSTOMER:', senderId)
    }

    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized - not assigned to this session' }, { status: 401 })
    }

    // Simple sanitization - strip HTML tags
    const sanitizedContent = content.replace(/<[^>]*>/g, '')

    const { data: message, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        content: sanitizedContent,
        attachments: attachments || [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert message:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    console.log('[send-message] Message inserted successfully:', message.id, 'from sender:', senderId)

    // Return response immediately
    const response = NextResponse.json({ message, tempId })

    // Create notification in background (non-blocking)
    queueMicrotask(() => {
      const recipientId = senderId === session.customer_user_id
        ? mechanicUserId
        : session.customer_user_id

      if (recipientId) {
        supabaseAdmin
          .from('notifications')
          .insert({
            user_id: recipientId,
            type: 'message_received',
            payload: {
              session_id: sessionId,
              message_id: message.id,
              sender_id: senderId,
              preview: sanitizedContent.substring(0, 100)
            }
          })
          .then(() => {
            console.log('[send-message] ✓ Created message_received notification for recipient:', recipientId)
          })
          .catch((notifError) => {
            console.warn('[send-message] Failed to create notification:', notifError)
          })
      }
    })

    return response
  } catch (error: any) {
    console.error('Error in send-message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
