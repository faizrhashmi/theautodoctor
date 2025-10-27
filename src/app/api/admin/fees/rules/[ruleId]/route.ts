import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/admin/fees/rules/[ruleId]
 *
 * Update a fee rule
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // TODO: Add admin authentication check

    const ruleId = params.ruleId
    const body = await req.json()

    // Can update any fields except id and created_at
    const allowedUpdates = [
      'rule_name',
      'rule_type',
      'description',
      'applies_to',
      'fee_percentage',
      'flat_fee',
      'min_job_value',
      'max_job_value',
      'service_categories',
      'tiers',
      'priority',
      'is_active'
    ]

    const updates: any = {}
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('platform_fee_rules')
      .update(updates)
      .eq('id', ruleId)

    if (error) {
      console.error('Error updating fee rule:', error)
      return NextResponse.json(
        { error: 'Failed to update fee rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Fee rule updated successfully'
    })

  } catch (error: any) {
    console.error('Error in PATCH fee rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update fee rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/fees/rules/[ruleId]
 *
 * Delete a fee rule
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // TODO: Add admin authentication check

    const ruleId = params.ruleId

    const { error } = await supabaseAdmin
      .from('platform_fee_rules')
      .delete()
      .eq('id', ruleId)

    if (error) {
      console.error('Error deleting fee rule:', error)
      return NextResponse.json(
        { error: 'Failed to delete fee rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Fee rule deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE fee rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete fee rule' },
      { status: 500 }
    )
  }
}
