import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * GET /api/mechanic/active-sessions
 *
 * Get active sessions for the authenticated mechanic
 * UPDATED: Uses unified Supabase Auth via requireMechanicAPI
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Use unified auth guard
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) {
      return authResult.error
    }

    const mechanic = authResult.data

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Fetch active sessions (pending, live, waiting, or scheduled) for this mechanic
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        started_at,
        customer_user_id
      `)
      .eq('mechanic_id', mechanic.id)
      .in('status', ['pending', 'live', 'waiting', 'scheduled'])
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('[Mechanic Active Sessions] Fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 })
    }

    // Fetch customer names for sessions
    const customerIds = [...new Set(sessions.map(s => s.customer_user_id).filter(Boolean))]
    let customerNames: Record<string, string> = {}

    if (customerIds.length > 0) {
      const { data: customers } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', customerIds)

      if (customers) {
        customerNames = customers.reduce((acc, c) => {
          acc[c.id] = c.full_name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Format sessions for MechanicActiveSessionsManager
    const formattedSessions = sessions.map(session => {
      const planLabels: Record<string, string> = {
        'chat10': 'Quick Chat (10 min)',
        'video15': 'Standard Video (15 min)',
        'diagnostic': 'Full Diagnostic (30 min)',
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
        customerName: session.customer_user_id ? (customerNames[session.customer_user_id] || 'Customer') : 'Customer'
      }
    })

    const response = NextResponse.json({
      sessions: formattedSessions,
      hasActiveSessions: formattedSessions.length > 0
    })

    // Add cache headers - very short cache for active sessions (5 seconds)
    // Active sessions change frequently, so we keep cache duration minimal
    // Real-time subscriptions will handle immediate updates anyway
    response.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10')

    return response

  } catch (error) {
    console.error('[Mechanic Active Sessions] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
