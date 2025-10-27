/**
 * Fee Calculator Tests
 *
 * Test various scenarios to ensure fee calculation works correctly
 */

import { FeeCalculator, type FeeRule, type FeeCalculationInput } from './feeCalculator'

// Mock fee rules for testing
const mockRules: FeeRule[] = [
  // High priority: Routine maintenance discount
  {
    id: '1',
    rule_name: 'Routine Maintenance Fee',
    rule_type: 'service_based',
    applies_to: 'all',
    max_job_value: 150,
    service_categories: ['oil_change', 'tire_rotation', 'air_filter'],
    fee_percentage: 8,
    priority: 10,
    is_active: true
  },
  // Medium priority: Large repair discount
  {
    id: '2',
    rule_name: 'Large Repair Discount',
    rule_type: 'percentage',
    applies_to: 'all',
    min_job_value: 1000,
    fee_percentage: 10,
    priority: 5,
    is_active: true
  },
  // Low priority: Standard workshop fee
  {
    id: '3',
    rule_name: 'Standard Workshop Fee',
    rule_type: 'percentage',
    applies_to: 'workshop',
    fee_percentage: 12,
    priority: 0,
    is_active: true
  },
  // Low priority: Standard independent fee
  {
    id: '4',
    rule_name: 'Standard Independent Fee',
    rule_type: 'percentage',
    applies_to: 'independent',
    fee_percentage: 12,
    priority: 0,
    is_active: true
  },
  // Tiered fee example
  {
    id: '5',
    rule_name: 'Tiered Mobile Fee',
    rule_type: 'tiered',
    applies_to: 'mobile',
    tiers: [
      { max_value: 200, fee_percent: 15 },
      { max_value: 500, fee_percent: 12 },
      { max_value: null, fee_percent: 10 }
    ],
    priority: 0,
    is_active: true
  }
]

describe('FeeCalculator', () => {
  describe('Percentage Fee Calculation', () => {
    test('Standard workshop fee (12%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 500,
        service_type: 'brakes',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(12)
      expect(result.platform_fee_amount).toBe(60)
      expect(result.customer_total).toBe(560)
      expect(result.provider_receives).toBe(500)
      expect(result.applied_rule).toBe('Standard Workshop Fee')
    })

    test('Standard independent mechanic fee (12%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 400,
        service_type: 'diagnostics',
        provider_type: 'independent',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(12)
      expect(result.platform_fee_amount).toBe(48)
      expect(result.customer_total).toBe(448)
    })
  })

  describe('Service-Based Fee Calculation', () => {
    test('Routine maintenance discount (8%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 85,
        service_type: 'oil_change',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      // Should match routine maintenance rule (higher priority than standard)
      expect(result.platform_fee_percent).toBe(8)
      expect(result.platform_fee_amount).toBe(6.8)
      expect(result.customer_total).toBe(91.8)
      expect(result.applied_rule).toContain('Routine Maintenance')
    })

    test('Does not apply routine discount above $150', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 200,
        service_type: 'oil_change',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      // Should fall back to standard workshop fee
      expect(result.platform_fee_percent).toBe(12)
    })
  })

  describe('Large Repair Discount', () => {
    test('Applies 10% fee for jobs over $1000', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 1500,
        service_type: 'transmission',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(10)
      expect(result.platform_fee_amount).toBe(150)
      expect(result.customer_total).toBe(1650)
      expect(result.applied_rule).toBe('Large Repair Discount')
    })

    test('Does not apply discount below $1000', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 999,
        service_type: 'transmission',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(12)
    })
  })

  describe('Tiered Fee Calculation', () => {
    test('Mobile mechanic - Tier 1 (under $200, 15%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 150,
        service_type: 'battery_replacement',
        provider_type: 'mobile',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(15)
      expect(result.platform_fee_amount).toBe(22.5)
      expect(result.applied_rule).toContain('Tier: $200')
    })

    test('Mobile mechanic - Tier 2 ($200-$500, 12%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 350,
        service_type: 'brakes',
        provider_type: 'mobile',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(12)
      expect(result.platform_fee_amount).toBe(42)
      expect(result.applied_rule).toContain('Tier: $500')
    })

    test('Mobile mechanic - Tier 3 (over $500, 10%)', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 800,
        service_type: 'suspension',
        provider_type: 'mobile',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_percent).toBe(10)
      expect(result.platform_fee_amount).toBe(80)
      expect(result.applied_rule).toContain('Tier: ∞')
    })
  })

  describe('Rule Priority', () => {
    test('Higher priority rule takes precedence', () => {
      const calculator = new FeeCalculator(mockRules)

      // Oil change under $150 - should match routine maintenance (priority 10)
      // instead of standard workshop fee (priority 0)
      const input: FeeCalculationInput = {
        subtotal: 85,
        service_type: 'oil_change',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.applied_rule).toContain('Routine Maintenance')
      expect(result.platform_fee_percent).toBe(8)
    })
  })

  describe('Edge Cases', () => {
    test('Zero subtotal', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 0,
        service_type: 'diagnostic',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_amount).toBe(0)
      expect(result.customer_total).toBe(0)
    })

    test('Very large job', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 5000,
        service_type: 'engine_rebuild',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      // Should apply large repair discount (10%)
      expect(result.platform_fee_percent).toBe(10)
      expect(result.platform_fee_amount).toBe(500)
      expect(result.customer_total).toBe(5500)
    })

    test('No matching rule uses default', () => {
      // Create calculator with only inactive rules
      const calculator = new FeeCalculator([])

      const input: FeeCalculationInput = {
        subtotal: 300,
        service_type: 'custom',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.applied_rule).toBe('Default (12%)')
      expect(result.platform_fee_percent).toBe(12)
    })
  })

  describe('Decimal Precision', () => {
    test('Handles decimal amounts correctly', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 123.45,
        service_type: 'diagnostic',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      expect(result.platform_fee_amount).toBe(14.81) // 123.45 * 0.12 = 14.814, rounded
      expect(result.customer_total).toBe(138.26)
    })

    test('Rounds to 2 decimal places', () => {
      const calculator = new FeeCalculator(mockRules)

      const input: FeeCalculationInput = {
        subtotal: 33.33,
        service_type: 'diagnostic',
        provider_type: 'workshop',
        line_items: []
      }

      const result = calculator.calculateFee(input)

      // 33.33 * 0.12 = 3.9996, should round to 4.00
      expect(result.platform_fee_amount).toBe(4.00)
      expect(result.customer_total).toBe(37.33)
    })
  })
})

// Run tests with: npx jest src/lib/fees/feeCalculator.test.ts
// Or: npm test

console.log('Fee Calculator Tests Defined')
console.log('To run tests: npx jest src/lib/fees/feeCalculator.test.ts')
