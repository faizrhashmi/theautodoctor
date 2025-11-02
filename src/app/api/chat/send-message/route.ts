import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import DOMPurify from 'isomorphic-dompurify'

// Helper to check mechanic auth using unified Supabase auth
async function getMechanicFromAuth() {
  const supabase = getSupabaseServer()

  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return null

  // Check if user has mechanic role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'mechanic') return null

  // Load mechanic profile
  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return mechanic
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, content, attachments } = await req.json()

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check auth - either customer (Supabase) or mechanic (unified Supabase auth)
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    const mechanic = await getMechanicFromAuth()

    // Verify user has access to this session FIRST to determine correct role
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // CRITICAL: Determine sender based on session assignment (mechanic takes priority)
    // This prevents role confusion when testing with both cookies present
    let senderId: string | null = null

    if (mechanic && session.mechanic_id === mechanic.id) {
      senderId = mechanic.user_id  // Use user_id for messages (auth.users ID)
      console.log('[send-message] Sender identified as MECHANIC:', senderId, '(mechanic.id:', mechanic.id, ')')
    } else if (user && session.customer_user_id === user.id) {
      senderId = user.id
      console.log('[send-message] Sender identified as CUSTOMER:', senderId)
    }

    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized - not assigned to this session' }, { status: 401 })
    }

    // P0-5 FIX: Sanitize message content server-side to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
    })

    // Insert message using admin client (bypasses RLS)
    const { data: message, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        content: sanitizedContent, // Use sanitized content
        attachments: attachments || [], // Empty array instead of null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert message:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    console.log('[send-message] Message inserted successfully:', message.id, 'from sender:', senderId)

    // Notify recipient of new message
    try {
      const recipientId = senderId === session.customer_user_id
        ? session.mechanic_id
        : session.customer_user_id

      if (recipientId) {
        await supabaseAdmin
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
        console.log('[send-message] ✓ Created message_received notification for recipient')
      }
    } catch (notifError) {
      console.warn('[send-message] Failed to create notification:', notifError)
      // Non-critical - don't fail the request
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Error in send-message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
