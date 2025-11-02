import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

/**
 * GET /api/admin/fees/rules
 *
 * Get all fee rules (active and inactive)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    console.info('[admin/fees] list rules', {
      admin: admin.email ?? auth.user?.id ?? 'unknown',
    })

    const { data: rules, error } = await supabaseAdmin
      .from('platform_fee_rules')
      .select('*')
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error fetching fee rules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fee rules' },
        { status: 500 }
      )
    }

    return NextResponse.json(rules)

  } catch (error: unknown) {
    console.error('Error in GET fee rules:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fee rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/fees/rules
 *
 * Create a new fee rule
 *
 * Body:
 * {
 *   rule_name: string,
 *   rule_type: 'flat' | 'percentage' | 'tiered' | 'service_based',
 *   description: string,
 *   applies_to: 'all' | 'workshop' | 'independent' | 'mobile',
 *   fee_percentage?: number,
 *   flat_fee?: number,
 *   min_job_value?: number,
 *   max_job_value?: number,
 *   service_categories?: string[],
 *   tiers?: object,
 *   priority: number,
 *   is_active: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    console.info('[admin/fees] create rule', {
      admin: admin.email ?? auth.user?.id ?? 'unknown',
    })

    const body = await req.json()

    const {
      rule_name,
      rule_type,
      description,
      applies_to,
      fee_percentage,
      flat_fee,
      min_job_value,
      max_job_value,
      service_categories,
      tiers,
      priority,
      is_active = true
    } = body

    // Validate required fields
    if (!rule_name || !rule_type || !applies_to) {
      return NextResponse.json(
        { error: 'rule_name, rule_type, and applies_to are required' },
        { status: 400 }
      )
    }

    // Validate rule_type
    if (!['flat', 'percentage', 'tiered', 'service_based'].includes(rule_type)) {
      return NextResponse.json(
        { error: 'Invalid rule_type' },
        { status: 400 }
      )
    }

    // Validate applies_to
    if (!['all', 'workshop', 'independent', 'mobile'].includes(applies_to)) {
      return NextResponse.json(
        { error: 'Invalid applies_to value' },
        { status: 400 }
      )
    }

    // Type-specific validations
    if (rule_type === 'percentage' || rule_type === 'service_based') {
      if (!fee_percentage) {
        return NextResponse.json(
          { error: 'fee_percentage is required for percentage and service_based rules' },
          { status: 400 }
        )
      }
    }

    if (rule_type === 'flat') {
      if (!flat_fee) {
        return NextResponse.json(
          { error: 'flat_fee is required for flat rules' },
          { status: 400 }
        )
      }
    }

    if (rule_type === 'tiered') {
      if (!tiers) {
        return NextResponse.json(
          { error: 'tiers is required for tiered rules' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate rule name
    const { data: existing } = await supabaseAdmin
      .from('platform_fee_rules')
      .select('id')
      .eq('rule_name', rule_name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A rule with this name already exists' },
        { status: 400 }
      )
    }

    // Create the rule
    const { data: rule, error: insertError } = await supabaseAdmin
      .from('platform_fee_rules')
      .insert({
        rule_name,
        rule_type,
        description: description || '',
        applies_to,
        fee_percentage: fee_percentage || null,
        flat_fee: flat_fee || null,
        min_job_value: min_job_value || null,
        max_job_value: max_job_value || null,
        service_categories: service_categories || null,
        tiers: tiers || null,
        priority: priority || 0,
        is_active
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating fee rule:', insertError)
      return NextResponse.json(
        { error: 'Failed to create fee rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rule: rule,
      message: 'Fee rule created successfully'
    })

  } catch (error: unknown) {
    console.error('Error in POST fee rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create fee rule' },
      { status: 500 }
    )
  }
}
