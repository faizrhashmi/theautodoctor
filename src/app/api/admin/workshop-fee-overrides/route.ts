import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

/**
 * GET /api/admin/workshop-fee-overrides
 *
 * Get all workshop fee overrides with workshop details
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  try {
    const { data: overrides, error } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .select(`
        *,
        organizations!workshop_id (
          id,
          name,
          city,
          province
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/workshop-fee-overrides] GET error:', error)
      return NextResponse.json({ error: 'Failed to load workshop overrides' }, { status: 500 })
    }

    // Format for UI
    const formattedOverrides = (overrides || []).map((o: any) => ({
      id: o.id,
      workshop_id: o.workshop_id,
      workshopName: o.organizations?.name || 'Unknown Workshop',
      workshopLocation: o.organizations?.city && o.organizations?.province
        ? `${o.organizations.city}, ${o.organizations.province}`
        : '',
      custom_session_platform_fee: o.custom_session_platform_fee,
      custom_quote_platform_fee: o.custom_quote_platform_fee,
      custom_escrow_hold_days: o.custom_escrow_hold_days,
      agreement_type: o.agreement_type,
      agreement_notes: o.agreement_notes,
      agreement_start_date: o.agreement_start_date,
      agreement_end_date: o.agreement_end_date,
      is_active: o.is_active,
    }))

    return NextResponse.json({ overrides: formattedOverrides })
  } catch (error) {
    console.error('[admin/workshop-fee-overrides] GET error:', error)
    return NextResponse.json({ error: 'Failed to load workshop overrides' }, { status: 500 })
  }
}

/**
 * POST /api/admin/workshop-fee-overrides
 *
 * Create a new workshop fee override
 */
export async function POST(req: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data

  try {
    const body = await req.json()

    const {
      workshop_id,
      custom_session_platform_fee,
      custom_quote_platform_fee,
      custom_escrow_hold_days,
      agreement_type,
      agreement_notes,
      agreement_start_date,
      agreement_end_date,
    } = body

    if (!workshop_id) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 })
    }

    // Check if override already exists
    const { data: existing } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .select('id')
      .eq('workshop_id', workshop_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Workshop already has a fee override. Edit the existing one instead.' },
        { status: 400 }
      )
    }

    // Create override
    const { error: insertError } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .insert({
        workshop_id,
        custom_session_platform_fee,
        custom_quote_platform_fee,
        custom_escrow_hold_days,
        agreement_type,
        agreement_notes,
        agreement_start_date,
        agreement_end_date,
        is_active: true,
        created_by: admin.id,
      })

    if (insertError) {
      console.error('[admin/workshop-fee-overrides] POST error:', insertError)
      return NextResponse.json({ error: 'Failed to create workshop override' }, { status: 500 })
    }

    console.log('[admin/workshop-fee-overrides] Created override for workshop:', workshop_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/workshop-fee-overrides] POST error:', error)
    return NextResponse.json({ error: 'Failed to create workshop override' }, { status: 500 })
  }
}
