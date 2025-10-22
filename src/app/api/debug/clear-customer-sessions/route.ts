import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Find all active/pending sessions for this customer
    const { data: activeSessions, error: findError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, created_at')
      .eq('customer_user_id', user.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({
        message: 'No active sessions to clear',
        cleared: 0
      })
    }

    // Mark them all as completed
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('customer_user_id', user.id)
      .in('status', ['pending', 'waiting', 'live', 'scheduled'])

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Cleared ${activeSessions.length} active session(s)`,
      cleared: activeSessions.length,
      sessions: activeSessions
    })
  } catch (error: any) {
    console.error('Error clearing sessions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
