import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Cache for 1 minute

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

    // Transform to match frontend format - includes ALL database fields
    const transformedPlans = plans.map(plan => ({
      // Basic identification
      id: plan.slug, // Use slug as ID for backward compatibility
      slug: plan.slug,
      name: plan.name,

      // Pricing
      price: `$${plan.price.toFixed(2)}`,
      priceValue: parseFloat(plan.price),
      stripePriceId: plan.stripe_price_id,

      // Duration
      duration: plan.duration_minutes >= 60
        ? `${Math.floor(plan.duration_minutes / 60)} hour${plan.duration_minutes > 60 ? 's' : ''}`
        : `${plan.duration_minutes} minute${plan.duration_minutes > 1 ? 's' : ''}`,
      durationMinutes: plan.duration_minutes,

      // Content
      description: plan.description,
      perks: plan.perks || [],
      recommendedFor: plan.recommended_for || '',

      // ✅ P0 FIX: Add previously missing critical fields
      // Subscription & Payment
      planType: plan.plan_type, // 'one_time' | 'subscription'
      billingCycle: plan.billing_cycle, // 'monthly' | 'annual' | null
      creditAllocation: plan.credit_allocation, // Credits per billing cycle

      // Feature Flags & Tier
      planCategory: plan.plan_category, // 'basic' | 'premium' | 'enterprise'
      features: plan.features || {}, // JSONB feature flags

      // Routing & Specialist Logic
      routingPreference: plan.routing_preference, // 'any' | 'general' | 'brand_specialist'
      restrictedBrands: plan.restricted_brands || [], // Brand specialist filters
      requiresCertification: plan.requires_certification || false // Red Seal requirement
    }))

    return NextResponse.json({ plans: transformedPlans })
  } catch (error) {
    console.error('[GET /api/plans] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
