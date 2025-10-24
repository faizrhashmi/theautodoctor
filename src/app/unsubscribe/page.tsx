'use client'

/**
 * H1: UNSUBSCRIBE PAGE (CASL Compliance)
 *
 * Allows users to unsubscribe from marketing emails.
 * Logs consent changes for audit trail.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email')
  const token = searchParams?.get('token')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnsubscribe = async () => {
    if (!email) {
      setError('Email address is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8">
        {success ? (
          <div>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">Successfully Unsubscribed</h1>
            <p className="text-slate-300 text-center mb-6">
              You have been removed from our marketing email list.
            </p>
            <p className="text-sm text-slate-400 text-center">
              You will still receive transactional emails related to your account and sessions.
            </p>
            <div className="mt-8 text-center">
              <a
                href="/"
                className="text-green-500 hover:text-green-400 font-semibold"
              >
                Return to Home
              </a>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10">
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">Unsubscribe from Emails</h1>
            <p className="text-slate-300 text-center mb-6">
              {email ? (
                <>
                  Are you sure you want to unsubscribe <strong>{email}</strong> from marketing emails?
                </>
              ) : (
                'Confirm that you want to unsubscribe from marketing emails.'
              )}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleUnsubscribe}
              disabled={loading || !email}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>

            <p className="mt-6 text-xs text-slate-400 text-center">
              Note: You will continue to receive important account-related and transactional emails.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
