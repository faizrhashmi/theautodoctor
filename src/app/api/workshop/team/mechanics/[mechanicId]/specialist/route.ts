import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ mechanicId: string }>
}

/**
 * PATCH /api/workshop/team/mechanics/[mechanicId]/specialist
 * Update specialist status for team member (workshop owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { mechanicId } = await context.params
    const supabase = await createClient()

    // Get authenticated workshop owner
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify mechanic exists and get their workshop_id
    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('workshop_id, account_type, name')
      .eq('id', mechanicId)
      .single()

    if (!mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    if (!mechanic.workshop_id) {
      return NextResponse.json(
        { error: 'Mechanic is not part of a workshop' },
        { status: 400 }
      )
    }

    // Verify user is owner/admin of this workshop
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', mechanic.workshop_id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be the workshop owner or admin to manage specialists' },
        { status: 403 }
      )
    }

    // Parse update data
    const updates = await request.json()

    // Validate required fields when designating as specialist
    if (updates.is_brand_specialist && (!updates.brand_specializations || updates.brand_specializations.length === 0)) {
      return NextResponse.json(
        { error: 'Brand specializations required when designating as specialist' },
        { status: 400 }
      )
    }

    // Update mechanic specialist status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        is_brand_specialist: updates.is_brand_specialist,
        brand_specializations: updates.brand_specializations,
        specialist_tier: updates.specialist_tier || 'general'
      })
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[Workshop Specialist Update] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update specialist status' },
        { status: 500 }
      )
    }

    console.log(
      `[Workshop Specialist] ${membership.role} updated ${mechanic.name} (${mechanicId}):`,
      `specialist=${updates.is_brand_specialist}, brands=${updates.brand_specializations?.join(',')}`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Workshop Specialist Update] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
