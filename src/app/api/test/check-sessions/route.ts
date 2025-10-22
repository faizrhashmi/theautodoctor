import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // Check session_requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Check sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      session_requests: {
        count: requests?.length || 0,
        error: requestsError?.message,
        recent: requests,
      },
      sessions: {
        count: sessions?.length || 0,
        error: sessionsError?.message,
        recent: sessions,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
