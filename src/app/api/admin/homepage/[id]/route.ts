import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/homepage/[id]
 * Update homepage section configuration
 *
 * Body:
 * {
 *   section_name?: string,
 *   section_value?: object,
 *   is_active?: boolean,
 *   display_order?: number
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
      section_name,
      section_value,
      is_active,
      display_order
    } = body

    // Build update object
    const updateData: any = {
      updated_by: admin.user?.id
    }

    if (section_name !== undefined) updateData.section_name = section_name
    if (section_value !== undefined) {
      if (typeof section_value !== 'object') {
        return NextResponse.json(
          { error: 'section_value must be an object' },
          { status: 400 }
        )
      }
      updateData.section_value = section_value
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order

    if (Object.keys(updateData).length === 1) { // Only updated_by
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const { data: updatedSection, error } = await supabaseAdmin
      .from('homepage_config')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/homepage/[id]] Update error:', error)
      return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
    }

    if (!updatedSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    console.log(`[PUT /api/admin/homepage/[id]] Updated by admin ${admin.user?.id}:`, updatedSection)

    return NextResponse.json(updatedSection)
  } catch (error) {
    console.error('[PUT /api/admin/homepage/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/homepage/[id]
 * Delete homepage section
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
      .from('homepage_config')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE /api/admin/homepage/[id]] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
    }

    console.log(`[DELETE /api/admin/homepage/[id]] Deleted by admin ${admin.user?.id}: ${id}`)

    return NextResponse.json({ success: true, message: 'Section deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/admin/homepage/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
