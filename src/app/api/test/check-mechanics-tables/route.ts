import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function getHandler() {
  try {
    // Check if mechanics table exists and get row count
    const { data: mechanics, error: mechanicsError, count: mechanicsCount } = await supabaseAdmin
      .from('mechanics')
      .select('id, email, name, created_at', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5)

    // Check if mechanic_sessions table exists and get row count
    const { data: sessions, error: sessionsError, count: sessionsCount } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('id, mechanic_id, created_at, expires_at', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      mechanics: {
        exists: !mechanicsError,
        error: mechanicsError?.message,
        count: mechanicsCount,
        recentRows: mechanics,
      },
      mechanic_sessions: {
        exists: !sessionsError,
        error: sessionsError?.message,
        count: sessionsCount,
        recentRows: sessions,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking mechanics tables:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
