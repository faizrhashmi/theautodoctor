import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/recommendations/[id]
 * Fetch a specific recommendation
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Try vehicle recommendation first
    const { data: vehicleRec, error: vehicleError } = await supabase
      .from('vehicle_recommendations')
      .select(`
        *,
        vehicle:vehicles (
          id,
          year,
          make,
          model,
          vin,
          odometer
        )
      `)
      .eq('id', id)
      .eq('customer_id', user.id)
      .single()

    if (!vehicleError && vehicleRec) {
      return NextResponse.json({ recommendation: vehicleRec, type: 'vehicle' })
    }

    // Try mechanic recommendation
    const { data: mechanicRec, error: mechanicError } = await supabase
      .from('mechanic_recommendations')
      .select(`
        *,
        mechanic:profiles!mechanic_recommendations_mechanic_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          specialties,
          bio
        )
      `)
      .eq('id', id)
      .eq('customer_id', user.id)
      .single()

    if (!mechanicError && mechanicRec) {
      return NextResponse.json({ recommendation: mechanicRec, type: 'mechanic' })
    }

    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  } catch (error: any) {
    console.error('[API] Error fetching recommendation:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/customer/recommendations/[id]
 * Update a recommendation (dismiss, schedule, complete)
 * Body: {
 *   action: 'dismiss' | 'schedule' | 'complete',
 *   dismiss_reason?: string,
 *   scheduled_session_id?: string
 * }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { action, dismiss_reason, scheduled_session_id } = body

    if (!action || !['dismiss', 'schedule', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Check if it's a vehicle recommendation
    const { data: existingRec } = await supabase
      .from('vehicle_recommendations')
      .select('id')
      .eq('id', id)
      .eq('customer_id', user.id)
      .single()

    if (!existingRec) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    let updates: any = {}

    if (action === 'dismiss') {
      updates = {
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        dismissed_reason: dismiss_reason || null,
      }
    } else if (action === 'schedule') {
      if (!scheduled_session_id) {
        return NextResponse.json({ error: 'scheduled_session_id required for schedule action' }, { status: 400 })
      }
      updates = {
        status: 'scheduled',
        scheduled_session_id,
      }
    } else if (action === 'complete') {
      updates = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('vehicle_recommendations')
      .update(updates)
      .eq('id', id)
      .eq('customer_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update recommendation', details: updateError.message },
        { status: 500 }
      )
    }

    // Record feedback
    await supabase.from('recommendation_feedback').insert({
      customer_id: user.id,
      recommendation_type: 'vehicle',
      recommendation_id: id,
      action,
      feedback_text: dismiss_reason || null,
    })

    return NextResponse.json({
      recommendation: updated,
      message: `Recommendation ${action}ed successfully`,
    })
  } catch (error: any) {
    console.error('[API] Error updating recommendation:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/customer/recommendations/[id]
 * Delete a recommendation (admin only or expired recommendations)
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Only allow deletion of dismissed or expired recommendations
    const { error: deleteError } = await supabase
      .from('vehicle_recommendations')
      .delete()
      .eq('id', id)
      .eq('customer_id', user.id)
      .in('status', ['dismissed', 'expired'])

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete recommendation', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation deleted successfully',
    })
  } catch (error: any) {
    console.error('[API] Error deleting recommendation:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
