import { useEffect, useState } from 'react'

export interface ServicePlan {
  // Basic identification
  id: string
  slug: string
  name: string

  // Pricing
  price: string           // Formatted: "$9.99"
  priceValue: number      // Raw number: 9.99
  stripePriceId: string | null

  // Duration
  duration: string        // Formatted: "30 minutes" or "1 hour"
  durationMinutes: number

  // Content
  description: string
  perks: string[]
  recommendedFor: string

  // Subscription & Payment
  planType: 'payg' | 'subscription'
  billingCycle: string | null
  creditAllocation: number

  // Feature Flags & Tier
  planCategory: string
  features: Record<string, any>

  // Routing & Specialist Logic
  routingPreference: string
  restrictedBrands: string[]
  requiresCertification: boolean
}

export interface UseServicePlansReturn {
  plans: ServicePlan[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch active service plans from the database
 *
 * Fetches from /api/plans which returns active PAYG plans
 * Caches result for 1 minute on server side
 *
 * @example
 * ```tsx
 * const { plans, loading, error } = useServicePlans()
 *
 * if (loading) return <Spinner />
 * if (error) return <Error message={error} />
 *
 * return plans.map(plan => <PlanCard key={plan.id} plan={plan} />)
 * ```
 */
export function useServicePlans(): UseServicePlansReturn {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/plans')

      if (!response.ok) {
        throw new Error(`Failed to fetch plans: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setPlans(data.plans || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      console.error('[useServicePlans] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans
  }
}

/**
 * Hook to fetch a single plan by slug
 *
 * @param slug - Plan slug (e.g., 'quick', 'standard', 'diagnostic')
 */
export function useServicePlan(slug: string) {
  const { plans, loading, error } = useServicePlans()

  const plan = plans.find(p => p.slug === slug)

  return {
    plan: plan || null,
    loading,
    error: error || (loading || plan ? null : `Plan "${slug}" not found`)
  }
}
