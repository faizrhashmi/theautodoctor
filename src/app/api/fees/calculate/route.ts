import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FeeCalculator, type FeeCalculationInput, type FeeRule } from '@/lib/fees/feeCalculator'

/**
 * POST /api/fees/calculate
 *
 * Calculate platform fee for a repair order quote
 *
 * Body:
 * {
 *   subtotal: number,
 *   service_type: string,
 *   provider_type: 'workshop' | 'independent' | 'mobile',
 *   line_items: LineItem[]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body: FeeCalculationInput = await req.json()

    // Validate input
    if (!body.subtotal || body.subtotal < 0) {
      return NextResponse.json(
        { error: 'Invalid subtotal' },
        { status: 400 }
      )
    }

    if (!body.provider_type || !['workshop', 'independent', 'mobile'].includes(body.provider_type)) {
      return NextResponse.json(
        { error: 'Invalid provider_type' },
        { status: 400 }
      )
    }

    // Load active fee rules from database
    const { data: rules, error } = await supabaseAdmin
      .from('platform_fee_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error loading fee rules:', error)
      return NextResponse.json(
        { error: 'Failed to load fee rules' },
        { status: 500 }
      )
    }

    // Create calculator with rules
    const calculator = new FeeCalculator(rules as FeeRule[])

    // Calculate fees
    const result = calculator.calculateFee(body)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Fee calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Fee calculation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/fees/calculate
 *
 * Get current fee structure (for documentation/transparency)
 */
export async function GET(req: NextRequest) {
  try {
    // Load all active fee rules
    const { data: rules, error } = await supabaseAdmin
      .from('platform_fee_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error loading fee rules:', error)
      return NextResponse.json(
        { error: 'Failed to load fee rules' },
        { status: 500 }
      )
    }

    // Return sanitized rules (remove internal IDs/metadata)
    const sanitizedRules = rules.map(rule => ({
      rule_name: rule.rule_name,
      description: rule.description,
      rule_type: rule.rule_type,
      applies_to: rule.applies_to,
      fee_percentage: rule.fee_percentage,
      min_job_value: rule.min_job_value,
      max_job_value: rule.max_job_value,
      service_categories: rule.service_categories
    }))

    return NextResponse.json({
      rules: sanitizedRules,
      default_fee: 12,
      currency: 'USD'
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fee structure' },
      { status: 500 }
    )
  }
}
