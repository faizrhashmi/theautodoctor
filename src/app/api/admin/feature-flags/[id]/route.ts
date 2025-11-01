import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/feature-flags/[id]
 * Update a feature flag (typically to toggle it on/off)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data
    const flagId = params.id
    const body = await request.json()

    console.info('[admin/feature-flags] update flag', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
      flagId,
    })

    const {
      flag_name,
      description,
      is_enabled,
      enabled_for_roles,
      rollout_percentage,
      metadata
    } = body

    // Check if flag exists
    const { data: existing } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', flagId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (flag_name !== undefined) updateData.flag_name = flag_name
    if (description !== undefined) updateData.description = description
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled
    if (enabled_for_roles !== undefined) updateData.enabled_for_roles = enabled_for_roles
    if (rollout_percentage !== undefined) updateData.rollout_percentage = rollout_percentage
    if (metadata !== undefined) updateData.metadata = metadata

    const { data: updatedFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .update(updateData)
      .eq('id', flagId)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/feature-flags/[id]] Database error:', error)
      return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 })
    }

    console.info('[admin/feature-flags] flag updated', {
      flag_key: updatedFlag.flag_key,
      is_enabled: updatedFlag.is_enabled,
    })

    return NextResponse.json({ flag: updatedFlag })
  } catch (error) {
    console.error('[PUT /api/admin/feature-flags/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/feature-flags/[id]
 * Delete a feature flag
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data
    const flagId = params.id

    console.info('[admin/feature-flags] delete flag', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
      flagId,
    })

    // Check if flag exists
    const { data: existing } = await supabaseAdmin
      .from('feature_flags')
      .select('id, flag_key')
      .eq('id', flagId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('feature_flags')
      .delete()
      .eq('id', flagId)

    if (error) {
      console.error('[DELETE /api/admin/feature-flags/[id]] Database error:', error)
      return NextResponse.json({ error: 'Failed to delete feature flag' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Feature flag deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/admin/feature-flags/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
