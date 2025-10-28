'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

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
 * - Graceful handling of cookie sync issues
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
  const [showError, setShowError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Delay error display to allow for cookie sync
  useEffect(() => {
    if (error && !isAuthenticated) {
      const timer = setTimeout(() => {
        setShowError(true)
      }, 2000) // Show error after 2 seconds if still not authenticated
      
      return () => clearTimeout(timer)
    } else {
      setShowError(false)
    }
  }, [error, isAuthenticated])

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

  // Show error state only after delay or if it's a critical error
  const isCookieSyncError = error?.includes('session') && error?.includes('missing')
  const shouldShowError = showError || (!isCookieSyncError && error)

  if (shouldShowError && !isAuthenticated) {
    return errorComponent || (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 border-2 border-red-500 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {isCookieSyncError ? 'Session Sync Issue' : 'Authentication Required'}
            </h2>
            <p className="text-red-200 mb-6">
              {isCookieSyncError 
                ? 'Having trouble accessing your session. This is usually temporary.'
                : error || 'You need to be signed in to access this page.'
              }
            </p>
            
            {isCookieSyncError ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-300 mb-3">
                    Try refreshing the page or click below to retry.
                  </p>
                  <button
                    onClick={() => {
                      setRetryCount(prev => prev + 1)
                      window.location.reload()
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-300 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Authentication
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  If this continues, please clear your browser cookies and try again.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  Redirecting you to sign in page...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Special case: Cookie sync issue but we're still loading or might recover
  if (error && isCookieSyncError && !showError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-blue-500/10 border-2 border-blue-500 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Syncing Session</h2>
            <p className="text-blue-200 mb-6">
              We're verifying your authentication session...
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                This should only take a moment
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
  const isCookieSyncError = error?.includes('session') && error?.includes('missing')
  
  return (
    <div className={`${
      isCookieSyncError 
        ? 'bg-yellow-500/10 border-2 border-yellow-500/50' 
        : 'bg-red-500/10 border-2 border-red-500/50'
    } rounded-xl p-4 flex items-start gap-3`}>
      <AlertCircle className={`w-5 h-5 ${
        isCookieSyncError ? 'text-yellow-400' : 'text-red-400'
      } flex-shrink-0 mt-0.5`} />
      <div>
        <p className={`${
          isCookieSyncError ? 'text-yellow-300' : 'text-red-300'
        } font-semibold mb-1`}>
          {isCookieSyncError ? 'Session Sync Issue' : 'Authentication Error'}
        </p>
        <p className={`${
          isCookieSyncError ? 'text-yellow-200' : 'text-red-200'
        } text-sm`}>
          {isCookieSyncError 
            ? 'Temporary authentication issue. Please refresh the page.'
            : error
          }
        </p>
        {isCookieSyncError && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-300 text-xs transition-colors"
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline auth status indicator for debugging
 */
export function AuthStatusDebug({ user, loading, error }: { 
  user: any, 
  loading: boolean, 
  error: string | null 
}) {
  if (process.env.NODE_ENV === 'production') return null
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-800/90 border border-slate-600 rounded-lg p-3 text-xs max-w-xs">
      <div className="font-mono space-y-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            loading ? 'bg-yellow-500' : 
            user ? 'bg-green-500' : 
            error ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="text-slate-300">
            {loading ? 'Loading...' : 
             user ? `Auth: ${user.email}` : 
             error ? `Error: ${error.substring(0, 30)}...` : 'No auth'}
          </span>
        </div>
        {error && (
          <div className="text-red-400 truncate">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}