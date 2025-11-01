'use client'

import { useState, useEffect } from 'react'

interface ServicePlan {
  // Basic identification
  id: string
  slug: string
  name: string

  // Pricing
  price: string
  priceValue: number
  stripePriceId: string | null

  // Duration
  duration: string
  durationMinutes: number

  // Content
  description: string
  perks: string[]
  recommendedFor: string

  // ✅ P0 FIX: Add required fields from API
  // Subscription & Payment
  planType: 'one_time' | 'subscription' | null
  billingCycle: 'monthly' | 'annual' | null
  creditAllocation: number | null

  // Feature Flags & Tier (now required, not optional)
  planCategory: 'basic' | 'premium' | 'enterprise'
  features: Record<string, boolean | string | number>

  // Routing & Specialist Logic (now required, not optional)
  routingPreference: 'any' | 'general' | 'brand_specialist'
  restrictedBrands: string[]
  requiresCertification: boolean
}

/**
 * Hook to fetch and check customer's selected plan features
 * @param planSlug - The slug of the plan (e.g., 'quick', 'standard', 'diagnostic')
 */
export function useCustomerPlan(planSlug?: string) {
  const [plan, setPlan] = useState<ServicePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planSlug) {
      setLoading(false)
      return
    }

    async function fetchPlan() {
      try {
        setLoading(true)
        const res = await fetch('/api/plans')
        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Find the specific plan by slug
        const selectedPlan = data.plans.find((p: ServicePlan) => p.slug === planSlug)

        if (!selectedPlan) {
          throw new Error(`Plan with slug "${planSlug}" not found`)
        }

        setPlan(selectedPlan)
        setError(null)
      } catch (err) {
        console.error('[useCustomerPlan] Error fetching plan:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch plan')
        setPlan(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [planSlug])

  /**
   * Check if the plan includes a specific feature
   * @param featureKey - The feature key to check (e.g., 'video_sessions', 'priority_support')
   * @returns boolean indicating if feature is enabled
   */
  const hasFeature = (featureKey: string): boolean => {
    if (!plan || !plan.features) return false
    return plan.features[featureKey] === true
  }

  /**
   * Check if multiple features are all enabled
   * @param featureKeys - Array of feature keys to check
   * @returns boolean indicating if ALL features are enabled
   */
  const hasAllFeatures = (featureKeys: string[]): boolean => {
    return featureKeys.every(key => hasFeature(key))
  }

  /**
   * Check if at least one of the features is enabled
   * @param featureKeys - Array of feature keys to check
   * @returns boolean indicating if ANY feature is enabled
   */
  const hasAnyFeature = (featureKeys: string[]): boolean => {
    return featureKeys.some(key => hasFeature(key))
  }

  /**
   * Check if plan requires brand specialist routing
   */
  const requiresBrandSpecialist = (): boolean => {
    return plan?.routingPreference === 'brand_specialist'
  }

  /**
   * Get list of restricted brands for this plan
   */
  const getRestrictedBrands = (): string[] => {
    return plan?.restrictedBrands || []
  }

  /**
   * Check if plan is premium or enterprise tier
   */
  const isPremiumTier = (): boolean => {
    return plan?.planCategory === 'premium' || plan?.planCategory === 'enterprise'
  }

  return {
    plan,
    loading,
    error,
    hasFeature,
    hasAllFeatures,
    hasAnyFeature,
    requiresBrandSpecialist,
    getRestrictedBrands,
    isPremiumTier,
  }
}

/**
 * Hook to fetch all available plans
 */
export function useServicePlans() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true)
        const res = await fetch('/api/plans')
        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setPlans(data.plans || [])
        setError(null)
      } catch (err) {
        console.error('[useServicePlans] Error fetching plans:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch plans')
        setPlans([])
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  return { plans, loading, error }
}
