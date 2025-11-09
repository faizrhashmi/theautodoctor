import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

/**
 * PUT /api/admin/workshop-fee-overrides/:id
 *
 * Update a workshop fee override
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data
  const overrideId = params.id

  try {
    const body = await req.json()

    const {
      custom_session_platform_fee,
      custom_quote_platform_fee,
      custom_escrow_hold_days,
      agreement_type,
      agreement_notes,
      agreement_start_date,
      agreement_end_date,
      is_active,
    } = body

    const { error: updateError } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .update({
        custom_session_platform_fee,
        custom_quote_platform_fee,
        custom_escrow_hold_days,
        agreement_type,
        agreement_notes,
        agreement_start_date,
        agreement_end_date,
        is_active,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', overrideId)

    if (updateError) {
      console.error('[admin/workshop-fee-overrides] PUT error:', updateError)
      return NextResponse.json({ error: 'Failed to update workshop override' }, { status: 500 })
    }

    console.log('[admin/workshop-fee-overrides] Updated override:', overrideId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/workshop-fee-overrides] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update workshop override' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/workshop-fee-overrides/:id
 *
 * Delete a workshop fee override
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const overrideId = params.id

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('workshop_fee_overrides')
      .delete()
      .eq('id', overrideId)

    if (deleteError) {
      console.error('[admin/workshop-fee-overrides] DELETE error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete workshop override' }, { status: 500 })
    }

    console.log('[admin/workshop-fee-overrides] Deleted override:', overrideId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/workshop-fee-overrides] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete workshop override' }, { status: 500 })
  }
}
