'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Car, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { routeFor, apiRouteFor } from '@/lib/routes'
import SocialAuthButtons from '@/components/auth/SocialAuthButtons'

export default function CustomerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const next = searchParams.get('next') || searchParams.get('redirect') || routeFor.customerDashboard()

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError && sessionError.message && !sessionError.message.includes('no session')) {
          console.log('[CustomerLogin] Session error:', sessionError.message)
          await supabase.auth.signOut()
          setError('Your session has expired. Please log in again.')
          return
        }

        if (session) {
          console.log('[CustomerLogin] Session found, verifying with API...')

          try {
            const response = await fetch(apiRouteFor.customerSessionsApi())

            if (response.ok) {
              const data = await response.json()

              if (data && data.sessions !== undefined) {
                console.log('[CustomerLogin] ✅ Valid customer session, redirecting...')
                router.push(next)
                return
              }
            }

            console.log('[CustomerLogin] Session invalid, clearing and staying on login')
            await supabase.auth.signOut()
          } catch (apiError) {
            console.error('[CustomerLogin] API verification failed:', apiError)
            await supabase.auth.signOut()
          }
        }
      } catch (err) {
        console.error('[CustomerLogin] Error checking session:', err)
        await supabase.auth.signOut()
      }
    }
    checkExistingSession()
  }, [supabase, router, next])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    console.log('[CustomerLogin] Starting login attempt for:', email)

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      console.log('[CustomerLogin] Calling server-side login API...')

      const loginRes = await fetch(apiRouteFor.customerLogin(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        console.error('[CustomerLogin] Login API error:', loginData.error)
        throw new Error(loginData.error || 'Login failed. Please try again.')
      }

      if (!loginData.access_token || !loginData.refresh_token) {
        throw new Error('Failed to receive authentication tokens.')
      }

      console.log('[CustomerLogin] Login API successful, setting session...')

      const setRes = await fetch(apiRouteFor.setSession(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: loginData.access_token,
          refresh_token: loginData.refresh_token
        }),
      })

      if (!setRes.ok) {
        const text = await setRes.text()
        console.error('[CustomerLogin] Failed to set server session:', text)
        throw new Error('Failed to establish session. Please try again.')
      }

      console.log('[CustomerLogin] ✅ Login successful, redirecting to:', next)

      window.location.href = next

    } catch (e: any) {
      console.error('[CustomerLogin] ❌ Login failed:', e)
      setError(e.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 pt-20 pb-8">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
              <Car className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-sm text-slate-300">Sign in to your AskAutoDoctor account</p>
          </div>

          {/* Social Auth Buttons */}
          <SocialAuthButtons
            mode="login"
            redirectTo={next}
            onError={(err) => setError(err)}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/5 px-2 text-slate-500">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              icon={Mail}
              placeholder="your@email.com"
              disabled={loading}
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              icon={Lock}
              placeholder="Your password"
              disabled={loading}
              autoComplete="current-password"
            />

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href={routeFor.signup()} className="font-semibold text-orange-400 hover:text-orange-300 transition">
                Sign up
              </Link>
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">or</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/mechanic/login"
                className="text-slate-400 hover:text-white transition text-xs"
              >
                Sign in as a Mechanic →
              </Link>
              <Link
                href="/workshop/login"
                className="text-slate-400 hover:text-white transition text-xs"
              >
                Sign in as a Workshop →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href={routeFor.home()} className="text-sm text-slate-400 hover:text-white transition">
            ← Back to homepage
          </Link>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  placeholder,
  disabled,
  autoComplete
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon?: React.ComponentType<{ className?: string }>
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <div className="relative mt-2">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  )
}


