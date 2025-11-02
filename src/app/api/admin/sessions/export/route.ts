// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { sessionIds, format = 'csv' } = body

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ error: 'Session IDs are required' }, { status: 400 })
    }

    // Fetch sessions with participants
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(
        `
        *,
        session_participants(
          user_id,
          role,
          users(email, user_metadata)
        )
      `
      )
      .in('id', sessionIds)

    if (sessionsError) {
      throw sessionsError
    }

    if (format === 'json') {
      return NextResponse.json(sessions, {
        headers: {
          'Content-Disposition': `attachment; filename=sessions-${Date.now()}.json`,
          'Content-Type': 'application/json',
        },
      })
    }

    // Generate CSV
    const csvRows: string[] = []

    // Header
    csvRows.push(
      [
        'Session ID',
        'Created At',
        'Type',
        'Status',
        'Plan',
        'Customer Name',
        'Customer Email',
        'Mechanic Name',
        'Mechanic Email',
        'Started At',
        'Ended At',
        'Duration (min)',
        'Rating',
        'Stripe Session ID',
      ].join(',')
    )

    // Data rows
    for (const session of sessions || []) {
      const customer = (session as any).session_participants?.find(
        (p: any) => p.role === 'customer'
      )
      const mechanic = (session as any).session_participants?.find(
        (p: any) => p.role === 'mechanic'
      )

      const customerName = customer?.users?.user_metadata?.name || 'N/A'
      const customerEmail = customer?.users?.email || 'N/A'
      const mechanicName = mechanic?.users?.user_metadata?.name || 'Unassigned'
      const mechanicEmail = mechanic?.users?.email || 'N/A'

      csvRows.push(
        [
          session.id,
          session.created_at,
          session.type,
          session.status || 'pending',
          session.plan,
          `"${customerName}"`,
          customerEmail,
          `"${mechanicName}"`,
          mechanicEmail,
          session.started_at || 'N/A',
          session.ended_at || 'N/A',
          session.duration_minutes || 'N/A',
          session.rating || 'N/A',
          session.stripe_session_id,
        ].join(',')
      )
    }

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Disposition': `attachment; filename=sessions-${Date.now()}.csv`,
        'Content-Type': 'text/csv',
      },
    })
  } catch (error: unknown) {
    console.error('Error exporting sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export sessions' },
      { status: 500 }
    )
  }
}
