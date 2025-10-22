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
    } catch (err) {
      setError((err as Error)?.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-8">
      <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur lg:p-10">
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Account recovery</span>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Reset Password</h1>
          <p className="text-sm text-slate-300">
            {"Enter your email and we'll send you a link to choose a new password."}
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-slate-950/40 p-8 shadow-lg backdrop-blur">
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3 text-sm text-emerald-100">
                <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-white">Check your email</h3>
                  <p className="mt-1">
                    We sent a password reset link to <span className="font-semibold text-white">{email}</span>. It expires in 30 minutes.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-slate-300">
              {"Didn't receive the email?"}{' '}
              <button
                onClick={() => setSuccess(false)}
                className="font-semibold text-orange-200 transition hover:text-white"
              >
                Try again
              </button>
            </p>

            <Link
              href="/signup"
              className="block text-center text-sm font-semibold text-orange-200 transition hover:text-white"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-slate-950/40 p-8 shadow-lg backdrop-blur">
            {error && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                placeholder="name@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-indigo-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-slate-300">
              Remember your password?{' '}
              <Link href="/customer/login" className="font-semibold text-orange-200 transition hover:text-white">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
