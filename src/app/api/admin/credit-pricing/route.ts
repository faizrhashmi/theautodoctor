import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/credit-pricing
 * Returns all credit pricing configurations (active and historical)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabaseAdmin
      .from('credit_pricing')
      .select('*, created_by_profile:profiles!credit_pricing_created_by_fkey(full_name, email)')
      .order('session_type', { ascending: true })
      .order('is_specialist', { ascending: false })
      .order('effective_from', { ascending: false })

    if (activeOnly) {
      query = query.or('effective_until.is.null,effective_until.gt.' + new Date().toISOString())
    }

    const { data: pricing, error } = await query

    if (error) {
      console.error('[GET /api/admin/credit-pricing] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch credit pricing' }, { status: 500 })
    }

    return NextResponse.json({ pricing: pricing || [] })
  } catch (error) {
    console.error('[GET /api/admin/credit-pricing] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/credit-pricing
 * Create new credit pricing configuration
 *
 * Body:
 * {
 *   session_type: 'quick' | 'video' | 'diagnostic',
 *   is_specialist: boolean,
 *   credit_cost: number,
 *   effective_from?: string (ISO timestamp),
 *   effective_until?: string (ISO timestamp),
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const body = await request.json()
    const {
      session_type,
      is_specialist,
      credit_cost,
      effective_from,
      effective_until,
      notes
    } = body

    // Validation
    if (!session_type || !['quick', 'video', 'diagnostic'].includes(session_type)) {
      return NextResponse.json(
        { error: 'Invalid session_type. Must be: quick, video, or diagnostic' },
        { status: 400 }
      )
    }

    if (typeof is_specialist !== 'boolean') {
      return NextResponse.json(
        { error: 'is_specialist must be a boolean' },
        { status: 400 }
      )
    }

    if (!credit_cost || credit_cost <= 0) {
      return NextResponse.json(
        { error: 'credit_cost must be a positive number' },
        { status: 400 }
      )
    }

    // Check for overlapping pricing
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('credit_pricing')
      .select('*')
      .eq('session_type', session_type)
      .eq('is_specialist', is_specialist)
      .or('effective_until.is.null,effective_until.gt.' + (effective_from || new Date().toISOString()))

    if (checkError) {
      console.error('[POST /api/admin/credit-pricing] Error checking existing pricing:', checkError)
      return NextResponse.json({ error: 'Failed to validate pricing' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      console.warn('[POST /api/admin/credit-pricing] Found overlapping pricing:', existing)
      // Allow creation but warn - admin may be updating pricing intentionally
    }

    const insertData = {
      session_type,
      is_specialist,
      credit_cost,
      effective_from: effective_from || new Date().toISOString(),
      effective_until: effective_until || null,
      notes: notes || null,
      created_by: admin.user?.id
    }

    const { data: newPricing, error: insertError } = await supabaseAdmin
      .from('credit_pricing')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/admin/credit-pricing] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 })
    }

    console.log(`[POST /api/admin/credit-pricing] Created by admin ${admin.user?.id}:`, newPricing)

    return NextResponse.json(newPricing, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/credit-pricing] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
