import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// GET /api/plans - Public endpoint for active plans
export async function GET() {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/plans] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    // Transform to match frontend format
    const transformedPlans = plans.map(plan => ({
      id: plan.slug, // Use slug as ID for backward compatibility
      slug: plan.slug,
      name: plan.name,
      price: `$${plan.price.toFixed(2)}`,
      priceValue: parseFloat(plan.price),
      duration: plan.duration_minutes >= 60
        ? `${Math.floor(plan.duration_minutes / 60)} hour${plan.duration_minutes > 60 ? 's' : ''}`
        : `${plan.duration_minutes} minute${plan.duration_minutes > 1 ? 's' : ''}`,
      durationMinutes: plan.duration_minutes,
      description: plan.description,
      perks: plan.perks || [],
      recommendedFor: plan.recommended_for || '',
      stripePriceId: plan.stripe_price_id
    }))

    return NextResponse.json({ plans: transformedPlans })
  } catch (error) {
    console.error('[GET /api/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
