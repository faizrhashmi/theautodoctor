'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/services-pricing', label: 'Services & Pricing' },
  { href: '/knowledge-base', label: 'Knowledge Base' },
]

export default function CustomerLoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/customer/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setErrors({ submit: 'Please enter your email and password' })
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Login failed. Please check your credentials.' })
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 200))
      window.location.href = redirectTo
    } catch (error) {
      setErrors({ submit: (error as Error)?.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-8">
      <div className="w-full max-w-5xl rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur lg:p-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Customer access</span>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Welcome Back</h1>
              <p className="mt-3 text-sm text-slate-300">
                Sign in to book sessions, upload vehicle details, and keep your mechanic in the loop.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-300">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Need a refresher?</p>
              <ul className="mt-4 space-y-2">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-flex items-center gap-2 text-orange-200 transition hover:text-white">
                      <span>→</span>
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                  {errors.submit}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-200">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-200">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex justify-end text-sm">
                <Link href="/customer/forgot-password" className="font-semibold text-orange-200 transition hover:text-white">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-orange-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-indigo-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
