// src/lib/auth/client.ts
/**
 * Client-side authentication utilities
 * Handles session validation, refresh, and cleanup
 */

import { createClient } from '@/lib/supabase'

// Create client instance for this module
const supabase = createClient()

/**
 * Validates the current session and clears it if invalid
 * This helps prevent stale session issues after dev server restarts
 */
export async function validateSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      // Session is invalid, clear it
      await clearSession()
      return false
    }

    // Try to get user to verify session is actually valid
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      // User fetch failed, session is stale
      await clearSession()
      return false
    }

    return true
  } catch (error) {
    console.error('[validateSession] Error:', error)
    await clearSession()
    return false
  }
}

/**
 * Clears the current session completely
 * Removes from localStorage, sessionStorage, and cookies
 */
export async function clearSession() {
  try {
    // Sign out from Supabase (clears cookies and storage)
    await supabase.auth.signOut()

    // Force clear localStorage keys (in case signOut fails)
    localStorage.removeItem('autodoctor.auth.token')

    // Clear any other auth-related items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })

    console.log('[clearSession] Session cleared successfully')
  } catch (error) {
    console.error('[clearSession] Error:', error)
  }
}

/**
 * Sets up auth state change listener
 * Automatically handles session refresh and invalidation
 */
export function setupAuthListener(
  onSignIn?: (session: any) => void,
  onSignOut?: () => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[Auth] State change:', event, session ? 'Session active' : 'No session')

      switch (event) {
        case 'SIGNED_IN':
          if (onSignIn && session) {
            onSignIn(session)
          }
          break

        case 'SIGNED_OUT':
          // Clear any remaining data
          await clearSession()
          if (onSignOut) {
            onSignOut()
          }
          break

        case 'TOKEN_REFRESHED':
          console.log('[Auth] Token refreshed successfully')
          break

        case 'USER_UPDATED':
          console.log('[Auth] User data updated')
          break
      }
    }
  )

  // Return cleanup function
  return () => {
    subscription.unsubscribe()
  }
}

/**
 * Validates and refreshes session, redirecting to login if invalid
 */
export async function requireAuth(loginPath = '/login'): Promise<boolean> {
  const isValid = await validateSession()

  if (!isValid) {
    // Store current path for redirect after login
    const currentPath = window.location.pathname + window.location.search
    window.location.href = `${loginPath}?redirect=${encodeURIComponent(currentPath)}`
    return false
  }

  return true
}
