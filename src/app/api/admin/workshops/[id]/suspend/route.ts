/**
 * POST /api/admin/workshops/[id]/suspend
 * Suspend a workshop (admin action)
 */

import { NextRequest, NextResponse } from 'next/server'
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

    // Parse request body
    const body = await request.json()
    const { reason } = body

    // Update workshop status to suspended
    const { data: workshop, error: updateError } = await supabase
      .from('workshops')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Workshops Suspend] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to suspend workshop' },
        { status: 500 }
      )
    }

    if (!workshop) {
      return NextResponse.json(
        { error: 'Workshop not found' },
        { status: 404 }
      )
    }

    // Log the suspension event
    await supabase.from('workshop_events').insert({
      workshop_id: id,
      event_type: 'workshop_suspended',
      event_data: {
        reason: reason || 'No reason provided',
        suspended_by: user.id,
        suspended_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Workshop suspended successfully',
      workshop
    })
  } catch (error: any) {
    console.error('[Admin Workshops Suspend] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
