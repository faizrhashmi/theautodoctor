/**
 * Fee Calculator
 *
 * Dynamic fee calculation engine that applies configurable rules
 * to determine platform fees for repair orders.
 *
 * Features:
 * - Multiple rule types (flat, percentage, tiered, service-based)
 * - Priority-based rule matching
 * - Conditional logic (job value, provider type, service category)
 * - Fallback to default fees
 */

export interface FeeRule {
  id: string
  rule_name: string
  rule_type: 'flat' | 'percentage' | 'tiered' | 'service_based'
  applies_to: 'all' | 'workshop' | 'independent' | 'mobile'
  min_job_value?: number
  max_job_value?: number
  service_categories?: string[]
  fee_percentage?: number
  flat_fee?: number
  tiers?: Array<{
    max_value: number | null
    fee_percent: number
  }>
  priority: number
  is_active: boolean
  description?: string
}

export interface QuoteLineItem {
  type: 'labor' | 'parts'
  description: string
  quantity?: number
  hours?: number
  rate?: number
  unit_cost?: number
  subtotal: number
}

export interface FeeCalculationInput {
  subtotal: number
  service_type: string // 'brakes', 'oil_change', 'diagnostic', 'general', etc.
  provider_type: 'workshop' | 'independent' | 'mobile'
  line_items: QuoteLineItem[]
}

export interface FeeCalculationResult {
  platform_fee_percent: number
  platform_fee_amount: number
  customer_total: number
  provider_receives: number
  applied_rule: string
  rule_id?: string
}

export class FeeCalculator {
  private rules: FeeRule[]

  /**
   * Initialize calculator with active fee rules
   */
  constructor(rules: FeeRule[]) {
    // Sort by priority (highest first)
    this.rules = rules
      .filter(r => r.is_active)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Calculate platform fee for a quote
   */
  calculateFee(input: FeeCalculationInput): FeeCalculationResult {
    // Find first matching rule
    const rule = this.findMatchingRule(input)

    if (!rule) {
      // Fallback to default 12%
      return this.calculateDefaultFee(input.subtotal)
    }

    // Calculate based on rule type
    switch (rule.rule_type) {
      case 'flat':
        return this.calculateFlatFee(input.subtotal, rule)

      case 'percentage':
        return this.calculatePercentageFee(input.subtotal, rule)

      case 'tiered':
        return this.calculateTieredFee(input.subtotal, rule)

      case 'service_based':
        return this.calculateServiceBasedFee(input, rule)

      default:
        return this.calculateDefaultFee(input.subtotal)
    }
  }

  /**
   * Find first rule that matches input criteria
   */
  private findMatchingRule(input: FeeCalculationInput): FeeRule | null {
    for (const rule of this.rules) {
      if (!this.ruleMatches(rule, input)) {
        continue
      }

      // Rule matches!
      return rule
    }

    return null
  }

  /**
   * Check if a rule matches the input
   */
  private ruleMatches(rule: FeeRule, input: FeeCalculationInput): boolean {
    // Check provider type
    if (rule.applies_to !== 'all' && rule.applies_to !== input.provider_type) {
      return false
    }

    // Check job value range
    if (rule.min_job_value !== undefined && input.subtotal < rule.min_job_value) {
      return false
    }
    if (rule.max_job_value !== undefined && input.subtotal > rule.max_job_value) {
      return false
    }

    // Check service categories
    if (rule.service_categories && rule.service_categories.length > 0) {
      if (!rule.service_categories.includes(input.service_type)) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate flat fee
   */
  private calculateFlatFee(subtotal: number, rule: FeeRule): FeeCalculationResult {
    const fee_amount = rule.flat_fee || 0
    const fee_percent = (fee_amount / subtotal) * 100

    return {
      platform_fee_percent: parseFloat(fee_percent.toFixed(2)),
      platform_fee_amount: fee_amount,
      customer_total: subtotal + fee_amount,
      provider_receives: subtotal,
      applied_rule: rule.rule_name,
      rule_id: rule.id
    }
  }

  /**
   * Calculate percentage fee
   */
  private calculatePercentageFee(subtotal: number, rule: FeeRule): FeeCalculationResult {
    const fee_percent = rule.fee_percentage || 12
    const fee_amount = (subtotal * fee_percent) / 100

    return {
      platform_fee_percent: fee_percent,
      platform_fee_amount: parseFloat(fee_amount.toFixed(2)),
      customer_total: parseFloat((subtotal + fee_amount).toFixed(2)),
      provider_receives: parseFloat(subtotal.toFixed(2)),
      applied_rule: rule.rule_name,
      rule_id: rule.id
    }
  }

  /**
   * Calculate tiered fee (graduated based on job value)
   */
  private calculateTieredFee(subtotal: number, rule: FeeRule): FeeCalculationResult {
    if (!rule.tiers || rule.tiers.length === 0) {
      return this.calculateDefaultFee(subtotal)
    }

    // Find applicable tier
    const tier = rule.tiers.find(t =>
      t.max_value === null || subtotal <= t.max_value
    )

    if (!tier) {
      // No matching tier, use default
      return this.calculateDefaultFee(subtotal)
    }

    const fee_amount = (subtotal * tier.fee_percent) / 100

    return {
      platform_fee_percent: tier.fee_percent,
      platform_fee_amount: parseFloat(fee_amount.toFixed(2)),
      customer_total: parseFloat((subtotal + fee_amount).toFixed(2)),
      provider_receives: parseFloat(subtotal.toFixed(2)),
      applied_rule: `${rule.rule_name} (Tier: ${tier.max_value ? '$' + tier.max_value : '∞'})`,
      rule_id: rule.id
    }
  }

  /**
   * Calculate service-based fee with custom logic
   */
  private calculateServiceBasedFee(input: FeeCalculationInput, rule: FeeRule): FeeCalculationResult {
    let fee_percent = rule.fee_percentage || 12

    // Custom logic based on service type
    const { service_type, subtotal } = input

    // Lower fees for routine maintenance
    if (['oil_change', 'tire_rotation', 'air_filter', 'wiper_blades'].includes(service_type)) {
      fee_percent = Math.min(fee_percent, 8) // Cap at 8%
    }

    // Higher fees for small diagnostics (to cover costs)
    if (service_type === 'diagnostic' && subtotal < 100) {
      fee_percent = Math.max(fee_percent, 15) // Minimum 15%
    }

    // Slightly lower fees for high-value jobs (incentivize)
    if (subtotal > 1000) {
      fee_percent = Math.min(fee_percent, 10) // Cap at 10%
    }

    const fee_amount = (subtotal * fee_percent) / 100

    return {
      platform_fee_percent: fee_percent,
      platform_fee_amount: parseFloat(fee_amount.toFixed(2)),
      customer_total: parseFloat((subtotal + fee_amount).toFixed(2)),
      provider_receives: parseFloat(subtotal.toFixed(2)),
      applied_rule: `${rule.rule_name} (${service_type})`,
      rule_id: rule.id
    }
  }

  /**
   * Default fallback fee (12%)
   */
  private calculateDefaultFee(subtotal: number): FeeCalculationResult {
    const fee_percent = 12
    const fee_amount = (subtotal * fee_percent) / 100

    return {
      platform_fee_percent: fee_percent,
      platform_fee_amount: parseFloat(fee_amount.toFixed(2)),
      customer_total: parseFloat((subtotal + fee_amount).toFixed(2)),
      provider_receives: parseFloat(subtotal.toFixed(2)),
      applied_rule: 'Default (12%)'
    }
  }

  /**
   * Get all active rules (for debugging/admin)
   */
  getRules(): FeeRule[] {
    return this.rules
  }

  /**
   * Simulate fee calculation (for testing)
   */
  simulate(scenarios: FeeCalculationInput[]): Array<FeeCalculationInput & FeeCalculationResult> {
    return scenarios.map(input => ({
      ...input,
      ...this.calculateFee(input)
    }))
  }
}

/**
 * Load fee rules from database and create calculator
 */
export async function createFeeCalculator(): Promise<FeeCalculator> {
  // This will be implemented in API route
  // For now, returns empty calculator
  return new FeeCalculator([])
}

/**
 * Helper: Calculate total from line items
 */
export function calculateLineItemsTotal(lineItems: QuoteLineItem[]): {
  labor_cost: number
  parts_cost: number
  subtotal: number
} {
  const labor_cost = lineItems
    .filter(i => i.type === 'labor')
    .reduce((sum, i) => sum + i.subtotal, 0)

  const parts_cost = lineItems
    .filter(i => i.type === 'parts')
    .reduce((sum, i) => sum + i.subtotal, 0)

  const subtotal = labor_cost + parts_cost

  return {
    labor_cost: parseFloat(labor_cost.toFixed(2)),
    parts_cost: parseFloat(parts_cost.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2))
  }
}

/**
 * Helper: Validate line item
 */
export function validateLineItem(item: QuoteLineItem): { valid: boolean; error?: string } {
  if (!item.description || item.description.trim() === '') {
    return { valid: false, error: 'Description is required' }
  }

  if (item.type === 'labor') {
    if (!item.hours || item.hours <= 0) {
      return { valid: false, error: 'Hours must be greater than 0' }
    }
    if (!item.rate || item.rate <= 0) {
      return { valid: false, error: 'Rate must be greater than 0' }
    }
  }

  if (item.type === 'parts') {
    if (!item.quantity || item.quantity <= 0) {
      return { valid: false, error: 'Quantity must be greater than 0' }
    }
    if (!item.unit_cost || item.unit_cost < 0) {
      return { valid: false, error: 'Unit cost cannot be negative' }
    }
  }

  if (!item.subtotal || item.subtotal < 0) {
    return { valid: false, error: 'Subtotal cannot be negative' }
  }

  return { valid: true }
}

/**
 * Helper: Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Helper: Format percentage
 */
export function formatPercent(percent: number): string {
  return `${percent.toFixed(2)}%`
}
