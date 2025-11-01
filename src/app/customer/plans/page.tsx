'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, CreditCard, Shield, Zap, TrendingUp, ArrowRight, Star } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface ServicePlan {
  id: string
  slug: string
  name: string
  price: number
  description: string
  perks: string[]
  recommended_for: string | null
  marketing_badge: string | null
  plan_type: 'payg' | 'subscription'
  credit_allocation: number
  billing_cycle: string | null
  discount_percent: number
  max_rollover_credits: number
  show_on_homepage: boolean
}

interface Subscription {
  id: string
  current_credits: number
  status: string
  plan: ServicePlan
}

export default function CustomerPlansPage() {
  const router = useRouter()
  const { loading: authLoading, user } = useAuthGuard('customer')

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [authLoading, user])

  async function loadData() {
    try {
      // Load subscription plans
      const plansRes = await fetch('/api/plans')
      if (plansRes.ok) {
        const plansData = await plansRes.json()
        const subscriptionPlans = plansData.plans.filter(
          (p: ServicePlan) => p.plan_type === 'subscription' && p.show_on_homepage
        )
        setPlans(subscriptionPlans)
      }

      // Load current subscription
      const subRes = await fetch('/api/customer/subscriptions')
      if (subRes.ok) {
        const subData = await subRes.json()
        setCurrentSubscription(subData.subscription)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function enrollInPlan(planId: string) {
    setEnrolling(planId)
    try {
      // TODO: Integrate with Stripe checkout
      const response = await fetch('/api/customer/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId })
      })

      if (response.ok) {
        alert('Subscription activated successfully!')
        loadData()
      } else {
        const data = await response.json()
        alert(`Failed to subscribe: ${data.error}`)
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      alert('Failed to subscribe. Please try again.')
    } finally {
      setEnrolling(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Save up to 15% with monthly subscriptions. Get credits for instant sessions with certified mechanics.
          </p>
        </div>

        {/* Current Subscription Banner */}
        {currentSubscription && (
          <div className="mb-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Active Subscription: {currentSubscription.plan.name}
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-blue-400">
                    💳 {currentSubscription.current_credits} credits remaining
                  </span>
                  <span className="text-green-400">
                    ✓ {currentSubscription.plan.discount_percent}% discount
                  </span>
                </div>
              </div>
              <Link
                href="/customer/dashboard"
                className="px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-8 transition ${
                plan.marketing_badge === 'POPULAR'
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Badge */}
              {plan.marketing_badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold rounded-full">
                  {plan.marketing_badge}
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-5xl font-bold text-white">${plan.price.toFixed(0)}</span>
                  <span className="text-slate-400 text-lg">/{plan.billing_cycle}</span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Save {plan.discount_percent}%
                </div>
              </div>

              {/* Plan Details */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Monthly Credits</span>
                  <span className="text-white font-semibold">{plan.credit_allocation}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Max Rollover</span>
                  <span className="text-white font-semibold">{plan.max_rollover_credits}</span>
                </div>
              </div>

              {/* Perks */}
              <ul className="space-y-3 mb-8">
                {plan.perks.map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => enrollInPlan(plan.id)}
                disabled={!!currentSubscription || enrolling === plan.id}
                className={`w-full px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  currentSubscription
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : plan.marketing_badge === 'POPULAR'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                {enrolling === plan.id ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Subscribing...
                  </>
                ) : currentSubscription ? (
                  'Already Subscribed'
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {plan.recommended_for && (
                <p className="mt-4 text-center text-xs text-slate-500">{plan.recommended_for}</p>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <Shield className="w-10 h-10 text-blue-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Cancel Anytime</h4>
            <p className="text-slate-400 text-sm">
              No long-term commitment. Cancel your subscription anytime from your dashboard.
            </p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <Zap className="w-10 h-10 text-purple-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Instant Sessions</h4>
            <p className="text-slate-400 text-sm">
              Use your credits for quick chat, video sessions, or full diagnostics anytime.
            </p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <CreditCard className="w-10 h-10 text-green-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">Credit Rollover</h4>
            <p className="text-slate-400 text-sm">
              Unused credits roll over to next month up to your plan limit. Never waste credits!
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <details className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                How do credits work?
              </summary>
              <p className="text-slate-400 text-sm mt-3">
                Each session type requires a certain number of credits. Quick chats use 3-10 credits,
                video sessions use 10-17 credits, and full diagnostics use 17-27 credits depending on
                whether you choose a standard mechanic or brand specialist.
              </p>
            </details>

            <details className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                What happens to unused credits?
              </summary>
              <p className="text-slate-400 text-sm mt-3">
                Unused credits roll over to the next month up to your plan's maximum rollover limit.
                For example, the Regular plan allows up to 15 credits to rollover.
              </p>
            </details>

            <details className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
              <summary className="text-white font-semibold cursor-pointer">
                Can I upgrade or downgrade my plan?
              </summary>
              <p className="text-slate-400 text-sm mt-3">
                Yes! You can upgrade or downgrade your plan at any time from your dashboard.
                Changes will take effect at the start of your next billing cycle.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
