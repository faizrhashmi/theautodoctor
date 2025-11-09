import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * POST /api/workshop/mechanics/[mechanicId]/remove
 * Remove a mechanic from the workshop (terminate employment)
 *
 * This triggers the 30-day cooling period automatically via database trigger
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { mechanicId: string } }
) {
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data

  // Only owners can remove mechanics
  if (workshop.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only workshop owners can remove mechanics' },
      { status: 403 }
    )
  }

  const mechanicId = params.mechanicId

  try {
    const body = await req.json()
    const { reason } = body

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Removal reason is required (minimum 10 characters)' },
        { status: 400 }
      )
    }

    // Verify the mechanic belongs to this workshop
    const { data: mechanic, error: fetchError } = await supabaseAdmin
      .from('mechanics')
      .select('id, user_id, name, workshop_id')
      .eq('id', mechanicId)
      .single()

    if (fetchError || !mechanic) {
      return NextResponse.json(
        { error: 'Mechanic not found' },
        { status: 404 }
      )
    }

    if (mechanic.workshop_id !== workshop.organizationId) {
      return NextResponse.json(
        { error: 'This mechanic does not belong to your workshop' },
        { status: 403 }
      )
    }

    // Remove the mechanic from the workshop by setting workshop_id to NULL
    // The database trigger will automatically:
    // 1. Set account_type back to 'individual_mechanic'
    // 2. Set service_tier to 'virtual_only'
    // 3. Suspend the account for 30 days
    // 4. Set ban_reason with cooling period explanation
    // 5. Log the change to mechanic_type_change_log
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        workshop_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[WORKSHOP] Remove mechanic error:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove mechanic' },
        { status: 500 }
      )
    }

    // Log the admin action for audit trail
    await supabaseAdmin.from('admin_actions').insert({
      action_type: 'mechanic_removed_from_workshop',
      target_user_id: mechanic.user_id,
      admin_id: workshop.userId,
      reason: reason,
      metadata: {
        mechanic_id: mechanicId,
        mechanic_name: mechanic.name,
        workshop_id: workshop.organizationId,
        workshop_name: workshop.organizationName,
        removed_by: 'workshop_owner',
      },
    })

    return NextResponse.json({
      success: true,
      message: `${mechanic.name} has been removed from your workshop. They will be subject to a 30-day cooling period before they can work again.`,
    })
  } catch (error: any) {
    console.error('[WORKSHOP] Remove mechanic error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
