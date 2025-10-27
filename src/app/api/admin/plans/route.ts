import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/plans - Get ALL plans (active + inactive)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.authorized) {
      return auth.response!
    }

    console.info('[admin/plans] list plans', {
      admin: auth.profile?.email ?? auth.user?.id ?? 'unknown',
    })

    const { data: plans, error } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/plans] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('[GET /api/admin/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/plans - Create new plan
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.authorized) {
      return auth.response!
    }

    const body = await request.json()

    console.info('[admin/plans] create plan', {
      admin: auth.profile?.email ?? auth.user?.id ?? 'unknown',
      slug: body.slug,
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
      stripe_price_id
    } = body

    // Validation
    if (!slug || !name || price === undefined || !duration_minutes || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, price, duration_minutes, description' },
        { status: 400 }
      )
    }

    // Check for duplicate slug
    const { data: existing } = await supabaseAdmin
      .from('service_plans')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A plan with this slug already exists' },
        { status: 409 }
      )
    }

    const { data: newPlan, error } = await supabaseAdmin
      .from('service_plans')
      .insert({
        slug,
        name,
        price: parseFloat(price),
        duration_minutes: parseInt(duration_minutes),
        description,
        perks: perks || [],
        recommended_for: recommended_for || '',
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0,
        stripe_price_id: stripe_price_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/plans] Database error:', error)
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
    }

    return NextResponse.json({ plan: newPlan }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
