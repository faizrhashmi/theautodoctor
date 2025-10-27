/**
 * F2: SATISFACTION CLAIMS - List and query claims
 *
 * GET /api/admin/claims
 * Query params:
 * - status: open | approved | rejected | refunded
 * - limit: number of results (default 50)
 * - offset: pagination offset
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(req: NextRequest) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabaseAdmin
      .from('satisfaction_claims')
      .select(
        `
        *,
        sessions!inner(id, plan, type, customer_user_id, created_at),
        refunds(id, amount_cents, status)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: claims, error, count } = await query

    if (error) {
      console.error('[claims:list] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    return NextResponse.json({
      claims,
      total: count,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('[claims:list] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch claims',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/claims
 * Create a new satisfaction claim (can be done by admin on behalf of customer)
 */
export async function POST(req: NextRequest) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(req)
  if (!auth.authorized) {
    return auth.response!
  }

  console.warn(
    `[ADMIN ACTION] ${auth.profile?.full_name} creating satisfaction claim`
  )

  try {
    const body = await req.json()
    const { sessionId, customerId, reason } = body as {
      sessionId: string
      customerId: string
      reason: string
    }

    if (!sessionId || !customerId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify customer owns session
    if (session.customer_user_id !== customerId) {
      return NextResponse.json({ error: 'Session does not belong to customer' }, { status: 403 })
    }

    // Check if claim already exists
    const { data: existingClaim } = await supabaseAdmin
      .from('satisfaction_claims')
      .select('id')
      .eq('session_id', sessionId)
      .eq('customer_id', customerId)
      .maybeSingle()

    if (existingClaim) {
      return NextResponse.json({ error: 'Claim already exists for this session' }, { status: 409 })
    }

    // Create claim
    const { data: claim, error: createError } = await supabaseAdmin
      .from('satisfaction_claims')
      .insert({
        session_id: sessionId,
        customer_id: customerId,
        reason,
        status: 'open',
      })
      .select()
      .single()

    if (createError) {
      console.error('[claims:create] Error:', createError)
      return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 })
    }

    console.log('[claims:create] ✓ Claim created:', claim.id)

    return NextResponse.json({
      success: true,
      claim,
    })
  } catch (error: any) {
    console.error('[claims:create] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create claim',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
