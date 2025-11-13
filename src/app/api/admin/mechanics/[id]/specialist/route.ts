// app/api/admin/mechanics/[id]/specialist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/mechanics/[id]/specialist
 *
 * Admin endpoint to manage mechanic specialist status
 * Supports:
 * - Approve specialist designation
 * - Revoke specialist status
 * - Override specialist fields (moderation)
 *
 * Body:
 * - action: 'approve' | 'revoke' | 'update'
 * - is_brand_specialist: boolean (for revoke/update)
 * - brand_specializations: string[] (for update)
 * - specialist_tier: 'general' | 'brand' | 'master' (for update)
 * - specialist_approved_at: ISO timestamp (for approve)
 * - specialist_approved_by: admin user ID (for approve)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Require admin authentication
    const admin = await requireAdmin()

    const params = await context.params
    const { id: mechanicId } = params
    const body = await request.json()
    const { action } = body

    // Validate mechanic exists
    const { data: mechanic, error: fetchError } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email, account_type, is_brand_specialist, specialist_tier')
      .eq('id', mechanicId)
      .single()

    if (fetchError || !mechanic) {
      return NextResponse.json(
        { error: 'Mechanic not found' },
        { status: 404 }
      )
    }

    let updateData: any = {}

    switch (action) {
      case 'approve':
        // Approve specialist designation
        updateData = {
          specialist_approved_at: body.specialist_approved_at || new Date().toISOString(),
          specialist_approved_by: body.specialist_approved_by || admin.id
        }
        break

      case 'revoke':
        // Revoke specialist status completely
        updateData = {
          is_brand_specialist: false,
          brand_specializations: [],
          specialist_tier: 'general',
          specialist_approved_at: null,
          specialist_approved_by: null
        }
        break

      case 'update':
        // Admin override - update specialist fields
        if (body.is_brand_specialist !== undefined) {
          updateData.is_brand_specialist = body.is_brand_specialist
        }
        if (body.brand_specializations !== undefined) {
          updateData.brand_specializations = body.brand_specializations
        }
        if (body.specialist_tier !== undefined) {
          updateData.specialist_tier = body.specialist_tier
        }

        // Validate brand specializations required when designating as specialist
        if (updateData.is_brand_specialist && (!updateData.brand_specializations || updateData.brand_specializations.length === 0)) {
          return NextResponse.json(
            { error: 'Brand specializations required when designating as specialist' },
            { status: 400 }
          )
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "approve", "revoke", or "update"' },
          { status: 400 }
        )
    }

    // Update mechanic specialist status
    // Admin uses supabaseAdmin to bypass RLS
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update(updateData)
      .eq('id', mechanicId)

    if (updateError) {
      console.error('[Admin Specialist Update] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update specialist status' },
        { status: 500 }
      )
    }

    // Log admin action for audit trail
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      action_type: `specialist_${action}`,
      target_type: 'mechanic',
      target_id: mechanicId,
      details: {
        mechanic_name: mechanic.name,
        mechanic_email: mechanic.email,
        account_type: mechanic.account_type,
        previous_tier: mechanic.specialist_tier,
        new_data: updateData
      },
      created_at: new Date().toISOString()
    }).catch(err => {
      // Don't fail the request if audit log fails, just log error
      console.error('[Admin Specialist Update] Audit log error:', err)
    })

    return NextResponse.json({
      success: true,
      message: `Specialist status ${action}d successfully`,
      mechanic_id: mechanicId
    })

  } catch (error: any) {
    console.error('[Admin Specialist Update] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/mechanics/[id]/specialist
 *
 * Get specialist status details for a specific mechanic
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Require admin authentication
    await requireAdmin()

    const params = await context.params
    const { id: mechanicId } = params

    // Fetch mechanic specialist details
    const { data: mechanic, error } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        account_type,
        is_brand_specialist,
        brand_specializations,
        specialist_tier,
        workshop_id,
        specialist_approved_at,
        specialist_approved_by,
        created_at,
        workshops:workshop_id (
          id,
          name
        )
      `)
      .eq('id', mechanicId)
      .single()

    if (error || !mechanic) {
      return NextResponse.json(
        { error: 'Mechanic not found' },
        { status: 404 }
      )
    }

    // Fetch specialist approval admin details if approved
    let approvedByAdmin = null
    if (mechanic.specialist_approved_by) {
      const { data: adminData } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('id', mechanic.specialist_approved_by)
        .single()

      approvedByAdmin = adminData
    }

    return NextResponse.json({
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        email: mechanic.email,
        account_type: mechanic.account_type,
        is_brand_specialist: mechanic.is_brand_specialist,
        brand_specializations: mechanic.brand_specializations || [],
        specialist_tier: mechanic.specialist_tier,
        workshop_id: mechanic.workshop_id,
        workshop_name: (mechanic.workshops as any)?.name || null,
        specialist_approved_at: mechanic.specialist_approved_at,
        approved_by_admin: approvedByAdmin,
        created_at: mechanic.created_at
      }
    })

  } catch (error: any) {
    console.error('[Admin Specialist Get] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
