import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Helper to check mechanic auth
async function getMechanicFromCookie() {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, content, attachments } = await req.json()

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check auth - either customer (Supabase) or mechanic (cookie)
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    const mechanic = await getMechanicFromCookie()

    const senderId = user?.id || mechanic?.id

    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this session
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const hasAccess =
      session.customer_user_id === senderId ||
      session.mechanic_id === senderId

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Insert message using admin client (bypasses RLS)
    const { data: message, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        content,
        attachments: attachments || [], // Empty array instead of null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert message:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    console.log('[send-message] Message inserted successfully:', message.id)

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Error in send-message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
