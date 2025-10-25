import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Get mechanic from custom auth system (aad_mech cookie)
 */
async function getMechanicFromCookie(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value
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
    .select('id, name, email, workshop_id')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

/**
 * GET /api/mechanic/earnings
 *
 * Returns mechanic's earnings with optional filters
 *
 * Query params:
 * - status: Filter by payout_status (pending, processing, paid, failed)
 * - limit: Number of records to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - from_date: Filter earnings created after this date (ISO 8601)
 * - to_date: Filter earnings created before this date (ISO 8601)
 */
export async function GET(req: NextRequest) {
  try {
    const mechanic = await getMechanicFromCookie(req)

    if (!mechanic) {
      return bad('Unauthorized - Please log in as a mechanic', 401)
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || undefined
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const fromDate = url.searchParams.get('from_date') || undefined
    const toDate = url.searchParams.get('to_date') || undefined

    console.log('[mechanic-earnings] Fetching earnings for mechanic:', mechanic.id, {
      status,
      limit,
      offset,
      fromDate,
      toDate,
    })

    // Build query
    let query = supabaseAdmin
      .from('mechanic_earnings')
      .select(`
        id,
        workshop_id,
        workshop_earning_id,
        session_id,
        payment_intent_id,
        gross_amount_cents,
        mechanic_net_cents,
        workshop_fee_cents,
        platform_fee_cents,
        currency,
        description,
        is_workshop_mechanic,
        payout_status,
        payout_id,
        payout_date,
        payout_error,
        created_at,
        organizations (
          id,
          name
        ),
        sessions (
          id,
          type,
          plan,
          started_at,
          ended_at,
          duration_minutes
        )
      `)
      .eq('mechanic_id', mechanic.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('payout_status', status)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: earnings, error } = await query

    if (error) {
      console.error('[mechanic-earnings] Database error:', error)
      return bad(error.message, 500)
    }

    // Get summary statistics
    const { data: summary } = await supabaseAdmin
      .from('mechanic_earnings_summary')
      .select('*')
      .eq('mechanic_id', mechanic.id)
      .single()

    console.log('[mechanic-earnings] Found', earnings?.length || 0, 'earnings')

    return NextResponse.json({
      ok: true,
      earnings: earnings || [],
      summary: summary || {
        total_sessions: 0,
        total_gross_cents: 0,
        total_net_cents: 0,
        total_platform_fee_cents: 0,
        total_workshop_fee_cents: 0,
        paid_out_cents: 0,
        pending_payout_cents: 0,
      },
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        workshop_id: mechanic.workshop_id,
      },
      pagination: {
        limit,
        offset,
        returned: earnings?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('[mechanic-earnings] Error:', error)
    return bad(error.message || 'Failed to fetch mechanic earnings', 500)
  }
}
