// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const supabase = getSupabaseServer()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw messagesError
    }

    return NextResponse.json({
      messages: messages || [],
    })
  } catch (error: unknown) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat messages' },
      { status: 500 }
    )
  }
}
