'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { validateSession } from '@/lib/auth/client'

/**
 * AuthValidator Component
 *
 * Validates authentication on page load and handles stale sessions.
 * This prevents authentication errors after dev server restarts.
 *
 * Usage: Add to your root layout or protected pages
 */
export function AuthValidator({
  children,
  requireAuth = false,
  loginPath = '/login'
}: {
  children: React.ReactNode
  requireAuth?: boolean
  loginPath?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isValidating, setIsValidating] = useState(requireAuth)

  useEffect(() => {
    if (!requireAuth) return

    async function checkAuth() {
      const isValid = await validateSession()

      if (!isValid) {
        console.log('[AuthValidator] Invalid session detected, redirecting to login')
        // Store current path for redirect after login
        const redirectUrl = `${loginPath}?redirect=${encodeURIComponent(pathname)}`
        router.push(redirectUrl)
      } else {
        setIsValidating(false)
      }
    }

    checkAuth()
  }, [requireAuth, loginPath, pathname, router])

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Validating session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * SessionMonitor Component
 *
 * Monitors auth state changes and handles automatic cleanup.
 * Add this to your root layout to enable global session monitoring.
 */
export function SessionMonitor() {
  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import('@/lib/auth/client').then(({ setupAuthListener }) => {
      const cleanup = setupAuthListener(
        (session) => {
          console.log('[SessionMonitor] User signed in')
        },
        () => {
          console.log('[SessionMonitor] User signed out')
          // Optionally redirect to home or login
        }
      )

      return cleanup
    })
  }, [])

  return null
}
