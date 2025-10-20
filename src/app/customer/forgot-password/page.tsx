'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {success ? (
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900">Check your email</h3>
                  <p className="mt-1 text-sm text-green-700">
                    We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Didn't receive the email?{' '}
              <button
                onClick={() => setSuccess(false)}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            </p>

            <Link
              href="/customer/login"
              className="mt-4 block text-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="john@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Remember your password?{' '}
              <Link href="/customer/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
