import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ✅ Force dynamic rendering - this route uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} fetching active sessions`)

    // Fetch active sessions (pending, live, waiting, or scheduled)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        started_at,
        mechanic_id
      `)
      .eq('customer_user_id', customer.id)
      .in('status', ['pending', 'live', 'waiting', 'scheduled'])
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Active sessions fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 })
    }

    // Fetch mechanic names for sessions that have mechanics assigned
    const mechanicIds = [...new Set(sessions.map(s => s.mechanic_id).filter(Boolean))]
    let mechanicNames: Record<string, string> = {}

    if (mechanicIds.length > 0) {
      const { data: mechanics } = await supabaseAdmin
        .from('mechanics')
        .select('id, name')
        .in('id', mechanicIds)

      if (mechanics) {
        mechanicNames = mechanics.reduce((acc, m) => {
          acc[m.id] = m.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Format sessions for ActiveSessionsManager
    const formattedSessions = sessions.map(session => {
      const planLabels: Record<string, string> = {
        'free_diagnostic': 'Free Diagnostic Session',
        'chat_only': 'Chat Session',
        'video_diagnostic': 'Video Diagnostic',
        'comprehensive': 'Comprehensive Diagnostic'
      }

      const typeLabels: Record<string, string> = {
        'chat': 'Chat Support',
        'video': 'Video Call',
        'diagnostic': 'Full Diagnostic'
      }

      return {
        id: session.id,
        plan: session.plan,
        planLabel: planLabels[session.plan] || session.plan,
        type: session.type,
        typeLabel: typeLabels[session.type] || session.type,
        status: session.status,
        createdAt: session.created_at,
        startedAt: session.started_at,
        mechanicName: session.mechanic_id ? (mechanicNames[session.mechanic_id] || 'Mechanic') : null
      }
    })

    return NextResponse.json({
      sessions: formattedSessions,
      hasActiveSessions: formattedSessions.length > 0
    })

  } catch (error) {
    console.error('Active sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
