import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// PUT /api/admin/plans/[id] - Update plan
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication check here

    const planId = params.id
    const body = await request.json()

    const {
      slug,
      name,
      price,
      duration_minutes,
      description,
      perks,
      recommended_for,
      is_active,
      display_order,
      stripe_price_id
    } = body

    // Check if plan exists
    const { data: existing } = await supabaseAdmin
      .from('service_plans')
      .select('id')
      .eq('id', planId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // If slug is being changed, check for duplicates
    if (slug) {
      const { data: duplicate } = await supabaseAdmin
        .from('service_plans')
        .select('id')
        .eq('slug', slug)
        .neq('id', planId)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'A plan with this slug already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}
    if (slug !== undefined) updateData.slug = slug
    if (name !== undefined) updateData.name = name
    if (price !== undefined) updateData.price = parseFloat(price)
    if (duration_minutes !== undefined) updateData.duration_minutes = parseInt(duration_minutes)
    if (description !== undefined) updateData.description = description
    if (perks !== undefined) updateData.perks = perks
    if (recommended_for !== undefined) updateData.recommended_for = recommended_for
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order
    if (stripe_price_id !== undefined) updateData.stripe_price_id = stripe_price_id

    const { data: updatedPlan, error } = await supabaseAdmin
      .from('service_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/plans/[id]] Database error:', error)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error('[PUT /api/admin/plans/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/plans/[id] - Delete plan
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication check here

    const planId = params.id

    // Check if plan exists
    const { data: existing } = await supabaseAdmin
      .from('service_plans')
      .select('id, slug')
      .eq('id', planId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Optional: Check if plan is being used in active sessions
    // You might want to prevent deletion if there are active sessions using this plan

    const { error } = await supabaseAdmin
      .from('service_plans')
      .delete()
      .eq('id', planId)

    if (error) {
      console.error('[DELETE /api/admin/plans/[id]] Database error:', error)
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/admin/plans/[id]] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
