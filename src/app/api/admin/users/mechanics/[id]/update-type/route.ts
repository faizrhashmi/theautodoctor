import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/admin/users/mechanics/[id]/update-type
 * Update mechanic type (account_type and workshop_id)
 *
 * Body: {
 *   account_type: 'individual_mechanic' | 'workshop_mechanic'
 *   workshop_id: string | null
 *   reason: string (required)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const mechanicId = params.id

  try {
    const body = await req.json()
    const { account_type, workshop_id, reason } = body

    // Validation
    if (!account_type) {
      return NextResponse.json({ error: 'account_type is required' }, { status: 400 })
    }

    if (!['individual_mechanic', 'workshop_mechanic'].includes(account_type)) {
      return NextResponse.json({
        error: 'account_type must be "individual_mechanic" or "workshop_mechanic"'
      }, { status: 400 })
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({
        error: 'Reason is required and must be at least 10 characters'
      }, { status: 400 })
    }

    // If setting to workshop_mechanic, workshop_id is required
    if (account_type === 'workshop_mechanic' && !workshop_id) {
      return NextResponse.json({
        error: 'workshop_id is required for workshop_mechanic account type'
      }, { status: 400 })
    }

    // Verify mechanic exists
    const { data: mechanic, error: mechError } = await supabaseAdmin
      .from('mechanics')
      .select('id, account_type, workshop_id, user_id')
      .eq('id', mechanicId)
      .single()

    if (mechError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // If assigning to workshop, verify workshop exists
    if (workshop_id) {
      const { data: workshop, error: workshopError } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', workshop_id)
        .single()

      if (workshopError || !workshop) {
        return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
      }
    }

    // Update mechanic type
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        account_type,
        workshop_id: workshop_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[ADMIN] Error updating mechanic type:', updateError)
      return NextResponse.json({
        error: 'Failed to update mechanic type'
      }, { status: 500 })
    }

    // Log the change with admin's reason
    await supabaseAdmin
      .from('mechanic_type_change_log')
      .insert({
        mechanic_id: mechanicId,
        old_account_type: mechanic.account_type,
        new_account_type: account_type,
        old_workshop_id: mechanic.workshop_id,
        new_workshop_id: workshop_id || null,
        changed_by: authResult.data.id,
        change_source: 'admin_manual',
        change_reason: reason,
      })

    return NextResponse.json({
      success: true,
      message: 'Mechanic type updated successfully',
      mechanic_type: account_type === 'workshop_mechanic' && workshop_id
        ? 'WORKSHOP_AFFILIATED'
        : workshop_id
        ? 'INDEPENDENT_WORKSHOP'
        : 'VIRTUAL_ONLY',
    })

  } catch (error: any) {
    console.error('[ADMIN] Error in update-type:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error',
    }, { status: 500 })
  }
}
