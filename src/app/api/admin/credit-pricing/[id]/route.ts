import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/credit-pricing/[id]
 * Update credit pricing configuration
 *
 * Body:
 * {
 *   credit_cost?: number,
 *   effective_from?: string,
 *   effective_until?: string,
 *   notes?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const { id } = params
    const body = await request.json()
    const {
      credit_cost,
      effective_from,
      effective_until,
      notes
    } = body

    // Validate credit_cost if provided
    if (credit_cost !== undefined && credit_cost <= 0) {
      return NextResponse.json(
        { error: 'credit_cost must be a positive number' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (credit_cost !== undefined) updateData.credit_cost = credit_cost
    if (effective_from !== undefined) updateData.effective_from = effective_from
    if (effective_until !== undefined) updateData.effective_until = effective_until
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const { data: updatedPricing, error } = await supabaseAdmin
      .from('credit_pricing')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/credit-pricing/[id]] Update error:', error)
      return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
    }

    if (!updatedPricing) {
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 })
    }

    console.log(`[PUT /api/admin/credit-pricing/[id]] Updated by admin ${admin.user?.id}:`, updatedPricing)

    return NextResponse.json(updatedPricing)
  } catch (error) {
    console.error('[PUT /api/admin/credit-pricing/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/credit-pricing/[id]
 * Delete credit pricing configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const { id } = params

    const { error } = await supabaseAdmin
      .from('credit_pricing')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE /api/admin/credit-pricing/[id]] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete pricing' }, { status: 500 })
    }

    console.log(`[DELETE /api/admin/credit-pricing/[id]] Deleted by admin ${admin.user?.id}: ${id}`)

    return NextResponse.json({ success: true, message: 'Pricing deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/admin/credit-pricing/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
