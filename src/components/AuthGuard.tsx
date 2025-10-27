'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Loader2, AlertCircle } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  requiredRole?: 'customer' | 'mechanic' | 'admin'
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

/**
 * AuthGuard component - Protects pages that require authentication
 *
 * Usage:
 * <AuthGuard>
 *   <YourProtectedContent />
 * </AuthGuard>
 *
 * Features:
 * - Automatic authentication check
 * - Loading state display
 * - Clear error messages
 * - Auto-redirect on failure
 */
export function AuthGuard({
  children,
  redirectTo = '/signup',
  requiredRole,
  loadingComponent,
  errorComponent
}: AuthGuardProps) {
  const { user, loading, error, isAuthenticated } = useAuthGuard({
    redirectTo,
    requiredRole
  })

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Verifying authentication...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !isAuthenticated) {
    return errorComponent || (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 border-2 border-red-500 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Authentication Required</h2>
            <p className="text-red-200 mb-6">
              {error || 'You need to be signed in to access this page.'}
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-300">
                Redirecting you to sign in page...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated - render children
  return <>{children}</>
}

/**
 * Lightweight loading component for quick auth checks
 */
export function AuthLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
    </div>
  )
}

/**
 * Error message component for auth failures
 */
export function AuthErrorMessage({ error }: { error: string }) {
  return (
    <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-300 font-semibold mb-1">Authentication Error</p>
        <p className="text-red-200 text-sm">{error}</p>
      </div>
    </div>
  )
}
