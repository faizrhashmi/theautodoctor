import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthGuardOptions {
  redirectTo?: string
  requiredRole?: 'customer' | 'mechanic' | 'admin'
  onAuthError?: (error: string) => void
}

interface AuthGuardResult {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

/**
 * Custom hook to guard pages that require authentication
 *
 * Usage:
 * const { user, loading, error } = useAuthGuard()
 *
 * Features:
 * - Automatic redirect on auth failure
 * - Clear error messages
 * - Loading state
 * - Role-based access control
 */
export function useAuthGuard(options: AuthGuardOptions = {}): AuthGuardResult {
  const {
    redirectTo = '/signup',
    requiredRole,
    onAuthError
  } = options

  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('[useAuthGuard] Auth error:', authError)
        const errorMessage = getAuthErrorMessage(authError.message)
        setError(errorMessage)

        if (onAuthError) {
          onAuthError(errorMessage)
        }

        // Show user-friendly alert
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            alert(`Authentication Error\n\n${errorMessage}\n\nYou will be redirected to sign in.`)
          }, 100)
        }

        // Redirect after a short delay
        setTimeout(() => {
          const currentPath = window.location.pathname
          router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
        }, 1000)

        setLoading(false)
        return
      }

      if (!authUser) {
        const errorMessage = 'You are not signed in. Please sign in to continue.'
        setError(errorMessage)

        if (onAuthError) {
          onAuthError(errorMessage)
        }

        // Show user-friendly alert
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            alert(`Sign In Required\n\n${errorMessage}`)
          }, 100)
        }

        // Redirect after a short delay
        setTimeout(() => {
          const currentPath = window.location.pathname
          router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
        }, 1000)

        setLoading(false)
        return
      }

      // Check role if required
      if (requiredRole) {
        const hasRequiredRole = await checkUserRole(authUser.id, requiredRole)
        if (!hasRequiredRole) {
          const errorMessage = `Access denied. This page requires ${requiredRole} access.`
          setError(errorMessage)

          if (onAuthError) {
            onAuthError(errorMessage)
          }

          // Show user-friendly alert
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              alert(`Access Denied\n\n${errorMessage}`)
            }, 100)
          }

          // Redirect to appropriate dashboard
          setTimeout(() => {
            router.push(getRoleRedirect(requiredRole))
          }, 1000)

          setLoading(false)
          return
        }
      }

      // Success - user is authenticated
      setUser(authUser)
      setError(null)
      setLoading(false)

    } catch (err: any) {
      console.error('[useAuthGuard] Unexpected error:', err)
      const errorMessage = 'An unexpected error occurred. Please try signing in again.'
      setError(errorMessage)

      if (onAuthError) {
        onAuthError(errorMessage)
      }

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert(`Error\n\n${errorMessage}`)
        }, 100)
      }

      setTimeout(() => {
        router.push(redirectTo)
      }, 1000)

      setLoading(false)
    }
  }

  async function checkUserRole(userId: string, role: string): Promise<boolean> {
    // Implement role checking logic here
    // This is a placeholder - adjust based on your database structure
    try {
      if (role === 'customer') {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single()
        return !!data
      } else if (role === 'mechanic') {
        const { data } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', userId)
          .single()
        return !!data
      }
      return true
    } catch {
      return false
    }
  }

  function getRoleRedirect(role: string): string {
    switch (role) {
      case 'customer':
        return '/customer/dashboard'
      case 'mechanic':
        return '/mechanic/dashboard'
      case 'admin':
        return '/admin'
      default:
        return '/signup'
    }
  }

  function getAuthErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'invalid_grant': 'Your session has expired. Please sign in again.',
      'invalid_token': 'Your session is invalid. Please sign in again.',
      'user_not_found': 'User not found. Please sign in again.',
      'session_not_found': 'Your session has expired. Please sign in again.',
      'refresh_token_not_found': 'Your session has expired. Please sign in again.',
      'invalid_refresh_token': 'Your session has expired. Please sign in again.',
    }

    // Check if error code matches any known errors
    for (const [code, message] of Object.entries(errorMessages)) {
      if (errorCode.toLowerCase().includes(code.toLowerCase())) {
        return message
      }
    }

    // Default message
    return 'Your session has expired or is invalid. Please sign in again.'
  }

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user && !error
  }
}
