import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

// PUT /api/admin/plans/[id] - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    const planId = params.id
    const body = await request.json()

    console.info('[admin/plans] update plan', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
      planId,
    })

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
      stripe_price_id,
      plan_type,
      credit_allocation,
      billing_cycle,
      discount_percent,
      max_rollover_credits,
      show_on_homepage,
      marketing_badge,
      stripe_subscription_price_id,
      plan_category,
      features,
      routing_preference,
      restricted_brands,
      requires_certification
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
    if (plan_type !== undefined) updateData.plan_type = plan_type
    if (credit_allocation !== undefined) updateData.credit_allocation = credit_allocation
    if (billing_cycle !== undefined) updateData.billing_cycle = billing_cycle
    if (discount_percent !== undefined) updateData.discount_percent = discount_percent
    if (max_rollover_credits !== undefined) updateData.max_rollover_credits = max_rollover_credits
    if (show_on_homepage !== undefined) updateData.show_on_homepage = show_on_homepage
    if (marketing_badge !== undefined) updateData.marketing_badge = marketing_badge
    if (stripe_subscription_price_id !== undefined) updateData.stripe_subscription_price_id = stripe_subscription_price_id
    if (plan_category !== undefined) updateData.plan_category = plan_category
    if (features !== undefined) updateData.features = features
    if (routing_preference !== undefined) updateData.routing_preference = routing_preference
    if (restricted_brands !== undefined) updateData.restricted_brands = restricted_brands
    if (requires_certification !== undefined) updateData.requires_certification = requires_certification

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    const planId = params.id

    console.info('[admin/plans] delete plan', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
      planId,
    })

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
