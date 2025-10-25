import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Get workshop organization from session cookie
 */
async function getWorkshopFromSession(req: NextRequest) {
  const cookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-auth-token'
  const authToken = req.cookies.get(cookieName)?.value

  if (!authToken) {
    return null
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)

    if (userError || !user) {
      return null
    }

    // Get workshop organization for this user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        organization_id,
        role,
        organizations (
          id,
          name,
          organization_type
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !member || !member.organizations) {
      return null
    }

    if (member.organizations.organization_type !== 'workshop') {
      return null
    }

    return {
      organization_id: member.organizations.id,
      name: member.organizations.name,
      role: member.role,
    }
  } catch (error) {
    console.error('[workshop-earnings] Error getting workshop:', error)
    return null
  }
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

/**
 * GET /api/workshop/earnings
 *
 * Returns workshop's earnings with optional filters
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
    const workshop = await getWorkshopFromSession(req)

    if (!workshop) {
      return bad('Unauthorized - Please log in as a workshop member', 401)
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || undefined
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const fromDate = url.searchParams.get('from_date') || undefined
    const toDate = url.searchParams.get('to_date') || undefined

    console.log('[workshop-earnings] Fetching earnings for workshop:', workshop.organization_id, {
      status,
      limit,
      offset,
      fromDate,
      toDate,
    })

    // Build query
    let query = supabaseAdmin
      .from('workshop_earnings')
      .select(`
        id,
        session_id,
        session_request_id,
        mechanic_id,
        payment_intent_id,
        gross_amount_cents,
        platform_fee_cents,
        workshop_net_cents,
        currency,
        platform_fee_percentage,
        description,
        payout_status,
        payout_id,
        payout_date,
        payout_error,
        created_at,
        mechanics (
          id,
          name,
          email
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
      .eq('workshop_id', workshop.organization_id)
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
      console.error('[workshop-earnings] Database error:', error)
      return bad(error.message, 500)
    }

    // Get summary statistics
    const { data: summary } = await supabaseAdmin
      .from('workshop_earnings_summary')
      .select('*')
      .eq('workshop_id', workshop.organization_id)
      .single()

    console.log('[workshop-earnings] Found', earnings?.length || 0, 'earnings')

    return NextResponse.json({
      ok: true,
      earnings: earnings || [],
      summary: summary || {
        total_sessions: 0,
        total_gross_cents: 0,
        total_platform_fee_cents: 0,
        total_net_cents: 0,
        paid_out_cents: 0,
        pending_payout_cents: 0,
      },
      pagination: {
        limit,
        offset,
        returned: earnings?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('[workshop-earnings] Error:', error)
    return bad(error.message || 'Failed to fetch workshop earnings', 500)
  }
}
