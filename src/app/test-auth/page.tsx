'use client'

import { useEffect, useState } from 'react'

export default function TestAuthPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check basic auth
      const res = await fetch('/api/mechanics/stripe/onboard')
      const data = await res.json()

      setStatus({
        status: res.status,
        statusText: res.statusText,
        response: data,
      })
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Auth Test</h1>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold mb-2">API Response:</h2>
          <pre className="bg-slate-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">If you see 401 (Unauthorized):</h3>
            <p className="text-sm text-blue-800">
              You are not logged in. Go to <a href="/mechanic/login" className="underline">/mechanic/login</a> first.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900 mb-2">If you see 403 (Forbidden):</h3>
            <p className="text-sm text-amber-800">
              You are logged in but not as a mechanic. Check your profile role in the database.
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="font-semibold text-green-900 mb-2">If you see 200 (Success):</h3>
            <p className="text-sm text-green-800">
              Everything is working! Check the response above for your Stripe status.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/mechanic/login"
            className="inline-block rounded-lg bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-700"
          >
            Go to Mechanic Login
          </a>
        </div>
      </div>
    </div>
  )
}
