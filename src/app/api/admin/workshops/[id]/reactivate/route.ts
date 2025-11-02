/**
 * POST /api/admin/workshops/[id]/reactivate
 * Reactivate a suspended workshop (admin action)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { getSupabaseServer } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const { id } = await context.params
    const supabase = getSupabaseServer()

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check here when admin_users table is ready
    // For now, assume authenticated user is admin

    // Update workshop status to approved
    const { data: workshop, error: updateError } = await supabase
      .from('workshops')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Workshops Reactivate] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reactivate workshop' },
        { status: 500 }
      )
    }

    if (!workshop) {
      return NextResponse.json(
        { error: 'Workshop not found' },
        { status: 404 }
      )
    }

    // Log the reactivation event
    await supabase.from('workshop_events').insert({
      workshop_id: id,
      event_type: 'workshop_reactivated',
      event_data: {
        reactivated_by: user.id,
        reactivated_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Workshop reactivated successfully',
      workshop
    })
  } catch (error: unknown) {
    console.error('[Admin Workshops Reactivate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
