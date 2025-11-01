'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'

export default function StripeOnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRefresh = searchParams.get('refresh') === 'true'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    connected: boolean
    onboarding_completed: boolean
    payouts_enabled: boolean
  } | null>(null)

  useEffect(() => {
    // Check current status on mount
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/mechanics/stripe/onboard')
      if (!response.ok) {
        throw new Error('Failed to check Stripe status')
      }
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to check status', err)
      setError(err instanceof Error ? err.message : 'Failed to check status')
    }
  }

  const startOnboarding = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mechanics/stripe/onboard', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start onboarding')
      }

      const data = await response.json()

      // Redirect to Stripe-hosted onboarding
      window.location.href = data.url
    } catch (err) {
      console.error('Onboarding error', err)
      setError(err instanceof Error ? err.message : 'Failed to start onboarding')
      setLoading(false)
    }
  }

  if (status?.onboarding_completed && status?.payouts_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-green-200 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">Stripe Connected!</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Your account is set up and ready to receive payouts automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Onboarding Status</span>
                <span className="font-semibold text-green-600">Complete</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Payouts Enabled</span>
                <span className="font-semibold text-green-600">Yes</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Automatic Transfer</span>
                <span className="font-semibold text-green-600">3-7 days after session</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/mechanic/dashboard')}
              className="mt-6 w-full rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">Connect Your Bank Account</h1>
              <p className="mt-1 text-sm text-slate-600">
                Get paid automatically after each session via Stripe
              </p>
            </div>
          </div>

          {isRefresh && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                It looks like you didn&apos;t complete the setup. Click below to try again.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                1
              </div>
              <div>
                <p className="font-semibold text-slate-900">Verify your identity</p>
                <p className="text-sm text-slate-600">Stripe will ask for basic info to comply with regulations</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                2
              </div>
              <div>
                <p className="font-semibold text-slate-900">Connect your bank account</p>
                <p className="text-sm text-slate-600">Link where you want to receive your earnings</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                3
              </div>
              <div>
                <p className="font-semibold text-slate-900">Start earning</p>
                <p className="text-sm text-slate-600">Get paid automatically 3-7 days after each completed session</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
            <h3 className="font-semibold text-slate-900">How payouts work</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>You earn {MECHANIC_FEES.MECHANIC_SHARE_PERCENT}% of each session price</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Payouts transfer automatically after sessions end</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Money arrives in 3-7 business days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Stripe handles all tax forms (1099s) automatically</span>
              </li>
            </ul>
          </div>

          <button
            onClick={startOnboarding}
            disabled={loading}
            className="mt-8 w-full rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:bg-orange-400"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting to Stripe...
              </span>
            ) : (
              'Connect with Stripe'
            )}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Powered by Stripe Connect • Your data is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  )
}
