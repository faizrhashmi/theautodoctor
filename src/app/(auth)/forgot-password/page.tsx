'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4">
              <Mail className="w-7 h-7 text-orange-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Reset Password
            </h1>
            <p className="text-sm text-slate-400">
              Enter your email and we'll send you a link to reset your password
            </p>
          </div>

          {success ? (
            // Success State
            <div className="space-y-6">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Check your email</h3>
                    <p className="text-sm text-green-300">
                      We sent a password reset link to{' '}
                      <span className="font-semibold text-white">{email}</span>
                    </p>
                    <p className="text-sm text-green-300 mt-2">
                      The link expires in 30 minutes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-slate-400">
                  Didn't receive the email?{' '}
                  <button
                    onClick={() => setSuccess(false)}
                    className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Try again
                  </button>
                </p>

                <Link
                  href="/signup"
                  className="block text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            // Form State
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <p className="text-center text-sm text-slate-400">
                Remember your password?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Need help? Contact{' '}
          <a href="mailto:support@theautodoctor.com" className="text-orange-400 hover:text-orange-300 transition-colors">
            support@theautodoctor.com
          </a>
        </p>
      </div>
    </div>
  )
}
