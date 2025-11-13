'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type ResolveResponse = {
  sessionId: string
  type: 'chat' | 'video' | 'diagnostic'
  plan: string
}

type Status = 'loading' | 'redirecting' | 'error'

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id')
    if (!sessionIdParam) {
      setError('Missing Stripe session identifier.')
      setStatus('error')
      return
    }
    const encodedSessionId = encodeURIComponent(sessionIdParam)

    let isMounted = true
    const controller = new AbortController()
    let retryCount = 0
    const MAX_RETRIES = 10 // Try for ~20 seconds

    async function resolve(currentSessionId: string, encoded: string) {
      try {
        const response = await fetch(
          `/api/sessions/resolve-by-stripe?stripe_session_id=${encoded}`,
          { signal: controller.signal },
        )
        const payload = await response.json().catch(() => null)

        // If session not found and we haven't exceeded retries, wait and retry
        if (response.status === 404 && retryCount < MAX_RETRIES) {
          retryCount++
          console.log(`Session not found yet, retrying (${retryCount}/${MAX_RETRIES})...`)

          if (!isMounted) {
            return
          }

          // Wait 2 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000))

          if (!isMounted) {
            return
          }

          return resolve(currentSessionId, encoded) // Retry
        }

        if (!response.ok || !payload) {
          throw new Error(
            (payload as { error?: string } | null)?.error ?? 'Unable to confirm your session. The webhook may not be configured.',
          )
        }

        if (!isMounted) {
          return
        }

        const data = payload as ResolveResponse
        setStatus('redirecting')

        if (data.type === 'chat') {
          router.replace(`/chat/${data.sessionId}`)
        } else {
          router.replace(`/thank-you?session_id=${encoded}`)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return
        }
        if (!isMounted) {
          return
        }
        setError(err?.message ?? 'Unable to confirm your session.')
        setStatus('error')
      }
    }

    resolve(sessionIdParam, encodedSessionId)

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [router, searchParams])

  const showSpinner = status === 'loading' || status === 'redirecting'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {showSpinner ? (
          <>
            <h1 className="text-xl font-semibold text-slate-900">
              {status === 'loading' ? 'Finalizing your booking' : 'Opening your session'}
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              {status === 'loading'
                ? 'Hold tight while we confirm payment and prepare your session.'
                : 'Almost done! We are taking you to your session now.'}
            </p>
            <div className="mt-6 flex justify-center">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">We hit a snag</h1>
            <p className="mt-3 text-sm text-rose-600">{error ?? 'Unable to confirm your session.'}</p>
            <p className="mt-6 text-xs text-slate-500">
              Try refreshing the page. If that does not work, return to the dashboard or contact support for help.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Try again
              </button>
              <a href="/signup" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Back to start
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// Wrap with Suspense boundary for useSearchParams
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Finalizing your booking</h1>
          <p className="mt-3 text-sm text-slate-600">Hold tight while we confirm payment and prepare your session.</p>
          <div className="mt-6 flex justify-center">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        </div>
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
