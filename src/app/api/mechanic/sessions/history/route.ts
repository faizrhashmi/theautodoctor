import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

const PLAN_PRICING: Record<string, number> = {
  chat10: 999,
  video15: 2999,
  diagnostic: 4999,
}

const MECHANIC_SHARE = 0.7

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('mechanic_id', mechanic.id)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      // Add 1 day to include the entire end date
      const endDate = new Date(toDate)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lte('created_at', endDate.toISOString())
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('[MECHANIC SESSIONS HISTORY] Error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Calculate statistics (for all matching sessions, not just current page)
    let statsQuery = supabaseAdmin
      .from('sessions')
      .select('status, duration_minutes, plan')
      .eq('mechanic_id', mechanic.id)

    if (status && status !== 'all') {
      statsQuery = statsQuery.eq('status', status)
    }

    if (type && type !== 'all') {
      statsQuery = statsQuery.eq('type', type)
    }

    if (fromDate) {
      statsQuery = statsQuery.gte('created_at', fromDate)
    }

    if (toDate) {
      const endDate = new Date(toDate)
      endDate.setDate(endDate.getDate() + 1)
      statsQuery = statsQuery.lte('created_at', endDate.toISOString())
    }

    const { data: allSessions } = await statsQuery

    const stats = {
      total_sessions: allSessions?.length || 0,
      completed_sessions: allSessions?.filter(s => s.status === 'completed').length || 0,
      cancelled_sessions: allSessions?.filter(s => s.status === 'cancelled').length || 0,
      total_duration_minutes: allSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0,
      total_earnings_cents: allSessions
        ?.filter(s => s.status === 'completed')
        .reduce((sum, s) => {
          const baseCents = PLAN_PRICING[s.plan] || 0
          return sum + Math.round(baseCents * MECHANIC_SHARE)
        }, 0) || 0,
      avg_session_duration: 0,
    }

    if (stats.completed_sessions > 0) {
      const completedDuration = allSessions
        ?.filter(s => s.status === 'completed' && s.duration_minutes)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
      stats.avg_session_duration = Math.round(completedDuration / stats.completed_sessions)
    }

    return NextResponse.json({
      sessions,
      stats,
    })
  } catch (error) {
    console.error('[MECHANIC SESSIONS HISTORY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
