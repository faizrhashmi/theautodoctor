/**
 * Type definitions for Supabase RPC (stored procedure) functions
 * ✅ P0 FIX: Provide type safety for database function calls
 *
 * These types should match the RETURN types of your PostgreSQL functions
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Customer Analytics Functions
// ============================================================================

/**
 * Return type for get_customer_spending_trend RPC function
 * Shows monthly spending over last 12 months
 */
export interface CustomerSpendingTrendRow {
  month: string          // Format: 'YYYY-MM'
  total_spent: string    // Decimal as string (PostgreSQL returns numeric as string)
  session_count: number  // Number of sessions in that month
}

/**
 * Return type for get_customer_session_distribution RPC function
 * Shows breakdown of session types
 */
export interface CustomerSessionDistributionRow {
  session_type: 'chat' | 'video' | 'diagnostic' | 'upgraded_from_chat'
  count: number
  percentage: string  // Decimal as string
}

/**
 * Return type for get_customer_credit_balance RPC function
 * Returns current credit balance for active subscription
 */
export type CustomerCreditBalance = number

// ============================================================================
// Mechanic Analytics Functions
// ============================================================================

/**
 * Return type for mechanic revenue breakdown functions
 */
export interface MechanicRevenueRow {
  date: string
  total_revenue: string  // Decimal as string
  total_earnings: string // Decimal as string
  session_count: number
}

// ============================================================================
// Admin Analytics Functions
// ============================================================================

/**
 * Return type for platform-wide metrics
 */
export interface PlatformMetricsRow {
  metric_name: string
  metric_value: number
  calculated_at: string
}

/**
 * Return type for get_privacy_compliance_score function
 */
export interface PrivacyComplianceScore {
  total_customers: number
  compliant_customers: number
  non_compliant_customers: number
  compliance_score: number
  compliance_grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'F'
}

/**
 * Return type for get_consent_statistics function
 */
export interface ConsentStatisticsRow {
  consent_type: string
  granted_count: number
  withdrawn_count: number
  net_change: number
  opt_in_rate: number
}

// ============================================================================
// Type-safe RPC wrapper functions
// ============================================================================

/**
 * Type-safe wrapper for get_customer_spending_trend
 * @param supabase - Supabase client (admin or user)
 * @param customerId - Customer UUID
 * @returns Array of monthly spending data
 */
export async function getCustomerSpendingTrend(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerSpendingTrendRow[]> {
  const { data, error } = await supabase
    .rpc('get_customer_spending_trend', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_spending_trend error:', error)
    throw error
  }

  return data || []
}

/**
 * Type-safe wrapper for get_customer_session_distribution
 * @param supabase - Supabase client (admin or user)
 * @param customerId - Customer UUID
 * @returns Array of session type distribution
 */
export async function getCustomerSessionDistribution(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerSessionDistributionRow[]> {
  const { data, error } = await supabase
    .rpc('get_customer_session_distribution', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_session_distribution error:', error)
    throw error
  }

  return data || []
}

/**
 * Type-safe wrapper for get_customer_credit_balance
 * @param supabase - Supabase client (admin or user)
 * @param customerId - Customer UUID
 * @returns Current credit balance
 */
export async function getCustomerCreditBalance(
  supabase: SupabaseClient,
  customerId: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_customer_credit_balance', {
      p_customer_id: customerId
    })

  if (error) {
    console.error('[RPC] get_customer_credit_balance error:', error)
    throw error
  }

  return data || 0
}

/**
 * Type-safe wrapper for get_privacy_compliance_score
 * @param supabase - Supabase admin client
 * @returns Privacy compliance score object
 */
export async function getPrivacyComplianceScore(
  supabase: SupabaseClient
): Promise<PrivacyComplianceScore> {
  const { data, error } = await supabase
    .rpc('get_privacy_compliance_score')

  if (error) {
    console.error('[RPC] get_privacy_compliance_score error:', error)
    throw error
  }

  return data as PrivacyComplianceScore
}

/**
 * Type-safe wrapper for get_consent_statistics
 * @param supabase - Supabase admin client
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 * @returns Array of consent statistics by type
 */
export async function getConsentStatistics(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<ConsentStatisticsRow[]> {
  const { data, error } = await supabase
    .rpc('get_consent_statistics', {
      p_start_date: startDate,
      p_end_date: endDate
    })

  if (error) {
    console.error('[RPC] get_consent_statistics error:', error)
    throw error
  }

  return data || []
}

/**
 * Type-safe wrapper for suspend_workshop
 * @param supabase - Supabase admin client
 * @param organizationId - Workshop organization UUID
 * @param reason - Reason for suspension
 * @param suspendedBy - Admin user UUID
 * @returns Success boolean
 */
export async function suspendWorkshop(
  supabase: SupabaseClient,
  organizationId: string,
  reason: string,
  suspendedBy: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('suspend_workshop', {
      p_organization_id: organizationId,
      p_reason: reason,
      p_suspended_by: suspendedBy
    })

  if (error) {
    console.error('[RPC] suspend_workshop error:', error)
    throw error
  }

  return data === true
}

/**
 * Type-safe wrapper for activate_workshop
 * @param supabase - Supabase admin client
 * @param organizationId - Workshop organization UUID
 * @param activatedBy - Admin user UUID
 * @returns Success boolean
 */
export async function activateWorkshop(
  supabase: SupabaseClient,
  organizationId: string,
  activatedBy: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('activate_workshop', {
      p_organization_id: organizationId,
      p_activated_by: activatedBy
    })

  if (error) {
    console.error('[RPC] activate_workshop error:', error)
    throw error
  }

  return data === true
}

/**
 * Type-safe wrapper for deduct_session_credits
 * @param supabase - Supabase admin client
 * @param customerId - Customer UUID
 * @param sessionId - Session UUID
 * @param sessionType - Type of session
 * @param isSpecialist - Whether this is a brand specialist session
 * @param creditCost - Number of credits to deduct
 * @returns Success boolean
 */
export async function deductSessionCredits(
  supabase: SupabaseClient,
  customerId: string,
  sessionId: string,
  sessionType: string,
  isSpecialist: boolean,
  creditCost: number
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('deduct_session_credits', {
      p_customer_id: customerId,
      p_session_id: sessionId,
      p_session_type: sessionType,
      p_is_specialist: isSpecialist,
      p_credit_cost: creditCost
    })

  if (error) {
    console.error('[RPC] deduct_session_credits error:', error)
    throw error
  }

  return data === true
}
