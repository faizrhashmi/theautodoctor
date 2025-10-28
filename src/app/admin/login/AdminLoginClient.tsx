'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/branding/Logo'

interface AdminLoginClientProps {
  redirectTo: string
  initialError?: string
}

export default function AdminLoginClient({ redirectTo, initialError }: AdminLoginClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent any default form submission
    if (!isMounted) return false

    setError('')
    setIsLoading(true)

    try {
      // Make login request with JSON
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          redirect: redirectTo,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Successful login
        console.log('Login successful, redirecting to:', redirectTo)

        // Small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 200))

        // Force navigation using window.location for reliability
        window.location.href = redirectTo
      } else {
        // Login failed
        setError(data.error || 'Invalid login credentials')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }

    return false
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 pb-8 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-2xl p-8">
        {/* Logo Section */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showText={true} href="/" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="admin@yourdomain.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2.5 text-white font-medium hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-orange-500/25 transition"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  )
}