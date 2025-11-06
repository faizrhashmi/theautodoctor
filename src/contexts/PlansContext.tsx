'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ServicePlan {
  id: string
  slug: string
  name: string
  price: string
  priceValue: number
  stripePriceId: string | null
  duration: string
  durationMinutes: number
  description: string
  perks: string[]
  recommendedFor: string
  planType: 'one_time' | 'subscription' | null
  billingCycle: 'monthly' | 'annual' | null
  creditAllocation: number | null
  planCategory: 'basic' | 'premium' | 'enterprise'
  features: Record<string, boolean | string | number>
  routingPreference: 'any' | 'general' | 'brand_specialist'
  restrictedBrands: string[]
  requiresCertification: boolean
}

interface PlansContextValue {
  plans: ServicePlan[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const PlansContext = createContext<PlansContextValue | undefined>(undefined)

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/plans')
      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setPlans(data.plans || [])
    } catch (err) {
      console.error('[PlansContext] Error fetching plans:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return (
    <PlansContext.Provider value={{ plans, loading, error, refetch: fetchPlans }}>
      {children}
    </PlansContext.Provider>
  )
}

export function usePlansContext() {
  const context = useContext(PlansContext)
  if (context === undefined) {
    throw new Error('usePlansContext must be used within a PlansProvider')
  }
  return context
}
