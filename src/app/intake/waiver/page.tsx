'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WaiverSignature from '@/components/intake/WaiverSignature'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function IntakeWaiverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intakeData, setIntakeData] = useState<{
    intakeId: string
    name: string
    email: string
    plan: string
  } | null>(null)

  useEffect(() => {
    async function checkAccess() {
      try {
        // Get intake_id from URL params
        const intakeId = searchParams.get('intake_id')
        const plan = searchParams.get('plan') || 'trial'

        if (!intakeId) {
          setError('No intake session found. Please start from the intake form.')
          setLoading(false)
          return
        }

        // Check if waiver already signed for this intake
        const checkRes = await fetch(`/api/waiver/check?intake_id=${intakeId}`)
        const checkData = await checkRes.json()

        if (checkData.signed) {
          // Already signed, redirect to next step
          const redirectUrl = checkData.redirect || '/thank-you'
          router.push(redirectUrl)
          return
        }

        // Get user info for pre-filling
        const userRes = await fetch('/api/auth/me')
        if (userRes.ok) {
          const userData = await userRes.json()
          setIntakeData({
            intakeId,
            name: userData.user?.name || '',
            email: userData.user?.email || '',
            plan
          })
        } else {
          setIntakeData({
            intakeId,
            name: '',
            email: '',
            plan
          })
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error checking waiver access:', err)
        setError('Failed to load waiver. Please try again.')
        setLoading(false)
      }
    }

    checkAccess()
  }, [searchParams, router])

  const handleSubmitWaiver = async (signatureData: string, fullName: string) => {
    if (!intakeData) {
      throw new Error('No intake data available')
    }

    try {
      // Get IP and user agent for legal compliance
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null)
      const ipData = ipRes ? await ipRes.json() : null
      const ipAddress = ipData?.ip || 'unknown'
      const userAgent = navigator.userAgent

      const response = await fetch('/api/waiver/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intakeId: intakeData.intakeId,
          signatureData,
          fullName,
          ipAddress,
          userAgent,
          email: intakeData.email,
          plan: intakeData.plan,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit waiver')
      }

      const data = await response.json()

      // Redirect to next step (payment or thank you page)
      if (data.redirect) {
        router.push(data.redirect)
      } else {
        router.push('/thank-you')
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to submit waiver. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-900 via-slate-900 to-slate-950 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-400" />
          <p className="mt-4 text-lg text-white">Loading waiver...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-900 via-slate-900 to-slate-950 px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
            <AlertCircle className="h-8 w-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Error</h2>
          <p className="mt-3 text-sm text-slate-300">{error}</p>
          <button
            onClick={() => router.push('/intake')}
            className="mt-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-orange-500"
          >
            Return to Intake Form
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-800/40 via-slate-900 to-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-10 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base sm:text-lg text-white font-bold">
                Review & Accept Safety Agreement
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Quick agreement • Takes 30 seconds
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">
                Next Step:
              </p>
              <p className="text-xs sm:text-sm font-semibold text-orange-300">
                {intakeData?.plan === 'free' || intakeData?.plan === 'trial'
                  ? 'Find you a mechanic!'
                  : 'Secure payment'}
              </p>
            </div>
          </div>
        </div>

        <WaiverSignature
          onSubmit={handleSubmitWaiver}
          fullName={intakeData?.name}
          email={intakeData?.email}
          simplified={true}
        />
      </div>
    </main>
  )
}
