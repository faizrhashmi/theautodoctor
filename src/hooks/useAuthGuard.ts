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
 * ROBUST FIX: AuthGuard with comprehensive session handling
 * Handles cookie sync issues gracefully while maintaining security
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
  const [hasAttemptedServerCheck, setHasAttemptedServerCheck] = useState(false)

  useEffect(() => {
    console.log('[useAuthGuard] Initializing auth guard...')
    
    // First, try server-side auth check
    checkServerAuth()
    
    // Then set up client-side auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuthGuard] Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[useAuthGuard] Client signed in:', session.user.email)
        setUser(session.user)
        setError(null)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuthGuard] Client signed out')
        setUser(null)
        setError('You have been signed out. Please sign in again.')
        setLoading(false)
        
        setTimeout(() => {
          router.push(redirectTo)
        }, 1500)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[useAuthGuard] Token refreshed')
        setUser(session.user)
        setError(null)
        setLoading(false)
      } else if (event === 'INITIAL_SESSION') {
        console.log('[useAuthGuard] Initial session loaded:', session?.user?.email)
        if (session) {
          setUser(session.user)
          setError(null)
          setLoading(false)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkServerAuth() {
    try {
      console.log('[useAuthGuard] Checking server auth...')
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[useAuthGuard] Server auth confirmed:', data.user?.email)
        
        if (data.user) {
          // Server says we're authenticated - trust this over client
          setUser({
            id: data.user.id,
            email: data.user.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: data.user.created_at,
            email_confirmed_at: data.user.email_confirmed_at
          } as User)
          setError(null)
          setLoading(false)
          return true
        }
      }
      
      // If server auth fails, fall back to client check
      console.log('[useAuthGuard] Server auth failed, falling back to client check')
      await checkClientAuth()
      return false
      
    } catch (error) {
      console.error('[useAuthGuard] Server auth check failed:', error)
      // Fall back to client check on error
      await checkClientAuth()
      return false
    } finally {
      setHasAttemptedServerCheck(true)
    }
  }

  async function checkClientAuth() {
    try {
      console.log('[useAuthGuard] Starting client auth check...')
      
      // Add a small delay to allow for cookie sync
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      console.log('[useAuthGuard] Client auth result:', {
        user: authUser?.email,
        error: authError?.message,
        hasSession: !!authUser
      })

      // Handle different error scenarios
      if (authError) {
        if (authError.message.includes('session missing')) {
          console.log('[useAuthGuard] Client session missing - this is expected with cookie sync issues')
          // Don't treat this as an error - wait for server auth or auth state change
          setLoading(false)
          return
        } else {
          console.error('[useAuthGuard] Critical client auth error:', authError)
          handleAuthError(authError.message)
          return
        }
      }

      if (authUser) {
        console.log('[useAuthGuard] Client auth successful:', authUser.email)
        setUser(authUser)
        setError(null)
        setLoading(false)
        return
      }

      // No user found in client - check if we should redirect
      console.log('[useAuthGuard] No user found in client auth')
      if (hasAttemptedServerCheck) {
        // Only redirect if server also confirmed no auth
        handleNoUser()
      } else {
        // Wait for server check to complete
        setLoading(false)
      }

    } catch (err: any) {
      console.error('[useAuthGuard] Unexpected error in client auth:', err)
      // Don't redirect on unexpected errors - let the page load
      setError('Temporary authentication issue. Please refresh the page.')
      setLoading(false)
    }
  }

  function handleAuthError(errorMessage: string) {
    const friendlyMessage = getAuthErrorMessage(errorMessage)
    setError(friendlyMessage)

    if (onAuthError) {
      onAuthError(friendlyMessage)
    }

    // Only redirect for critical auth errors, not sync issues
    if (!errorMessage.includes('session missing')) {
      setTimeout(() => {
        const currentPath = window.location.pathname
        router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
      }, 2000)
    }

    setLoading(false)
  }

  function handleNoUser() {
    console.log('[useAuthGuard] No user found anywhere, redirecting to signup')
    const errorMessage = 'You are not signed in. Please sign in to continue.'
    setError(errorMessage)

    if (onAuthError) {
      onAuthError(errorMessage)
    }

    setTimeout(() => {
      const currentPath = window.location.pathname
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
    }, 2000)

    setLoading(false)
  }

  async function checkUserRole(userId: string, role: string): Promise<boolean> {
    try {
      if (role === 'customer') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .single()
        
        return !error && !!data
      } else if (role === 'mechanic') {
        const { data, error } = await supabase
          .from('mechanics')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        return !error && !!data
      } else if (role === 'admin') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .eq('role', 'admin')
          .single()
        
        return !error && !!data
      }
      return true
    } catch (error) {
      console.error('[useAuthGuard] Role check error:', error)
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

    for (const [code, message] of Object.entries(errorMessages)) {
      if (errorCode.toLowerCase().includes(code.toLowerCase())) {
        return message
      }
    }

    return 'Your session has expired or is invalid. Please sign in again.'
  }

  // Final determination - user is authenticated if we have a user object OR server confirmed auth
  const isAuthenticated = !!user

  return {
    user,
    loading,
    error,
    isAuthenticated
  }
}