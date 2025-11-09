/**
 * Feature Gate Component
 *
 * Conditionally renders children based on feature flag status.
 * Use this to hide/show UI elements based on feature flags.
 *
 * @module components/guards/FeatureGate
 */

'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import type { FeatureFlagKey } from '@/config/featureFlags'

interface FeatureGateProps {
  feature: FeatureFlagKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Conditionally render children based on feature flag
 *
 * @param props.feature - The feature flag to check
 * @param props.children - Content to render when feature is enabled
 * @param props.fallback - Optional content to render when feature is disabled
 *
 * @example
 * ```tsx
 * <FeatureGate feature="ENABLE_WORKSHOP_RFQ">
 *   <RfqButton />
 * </FeatureGate>
 * ```
 *
 * @example
 * ```tsx
 * <FeatureGate
 *   feature="ENABLE_WORKSHOP_RFQ"
 *   fallback={<ComingSoonBadge />}
 * >
 *   <RfqMarketplace />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(feature)

  if (!enabled) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * RFQ-specific gate
 *
 * Convenience component for RFQ marketplace feature gating
 *
 * @param props.children - Content to render when RFQ is enabled
 * @param props.fallback - Optional content to render when RFQ is disabled
 *
 * @example
 * ```tsx
 * <RfqGate>
 *   <RfqMarketplaceLink />
 * </RfqGate>
 * ```
 */
export function RfqGate({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <FeatureGate feature="ENABLE_WORKSHOP_RFQ" fallback={fallback}>
      {children}
    </FeatureGate>
  )
}

/**
 * Customer RFQ Creation gate
 *
 * Convenience component for customer-direct RFQ creation feature gating
 *
 * @param props.children - Content to render when customer RFQ is enabled
 * @param props.fallback - Optional content to render when disabled
 *
 * @example
 * ```tsx
 * <CustomerRfqGate>
 *   <CreateRfqButton />
 * </CustomerRfqGate>
 * ```
 */
export function CustomerRfqGate({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <FeatureGate feature="ENABLE_CUSTOMER_RFQ" fallback={fallback}>
      {children}
    </FeatureGate>
  )
}

/**
 * Quote System gate
 *
 * Convenience component for diagnostic-based quote system feature gating
 * This is separate from RFQ - quotes are created by workshops after diagnostics
 *
 * @param props.children - Content to render when quote system is enabled
 * @param props.fallback - Optional content to render when disabled
 *
 * @example
 * ```tsx
 * <QuoteGate>
 *   <CreateQuoteButton />
 * </QuoteGate>
 * ```
 */
export function QuoteGate({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <FeatureGate feature="ENABLE_QUOTE_SYSTEM" fallback={fallback}>
      {children}
    </FeatureGate>
  )
}
