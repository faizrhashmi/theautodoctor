import { createClient as createBrowserClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let browserClient: SupabaseClient<Database> | null = null

// Check for logout flag at module load time
if (typeof window !== 'undefined' && sessionStorage.getItem('logout-pending') === 'true') {
  console.log('[supabase] Detected logout-pending flag, preventing singleton creation')
  browserClient = null
  sessionStorage.removeItem('logout-pending')
}

/**
 * Clear the singleton browser client
 * Call this when you need to force a fresh client (e.g., after logout)
 */
export function clearBrowserClient() {
  console.log('[supabase] Clearing singleton browser client')
  browserClient = null
}

export function createClient() {
  if (!url || !key) {
    console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_* environment variables')
    throw new Error('Supabase client cannot be instantiated without URL and anon key')
  }

  // CRITICAL: Check for logout flag EVERY TIME createClient is called
  // This ensures that even if the module was already loaded, we detect logout
  if (typeof window !== 'undefined' && sessionStorage.getItem('logout-pending') === 'true') {
    console.log('[supabase] Logout-pending detected in createClient(), clearing singleton')
    browserClient = null
    sessionStorage.removeItem('logout-pending')
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, key, {
      auth: {
        storageKey: 'autodoctor.auth.token',
        autoRefreshToken: true, // Auto-refresh tokens to prevent expiry
        persistSession: true, // Persist session in storage
        detectSessionInUrl: true, // Detect session from URL (for magic links)
        flowType: 'pkce', // Use PKCE flow for better security
      },
    })

    // Add global error handler for auth errors
    browserClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log(`[Supabase Auth] ${event}`, session ? 'Session active' : 'No session')
      }

      // If session becomes null unexpectedly, clear storage
      if (event === 'SIGNED_OUT' && !session) {
        console.log('[Supabase Auth] Session ended, clearing storage')
        // Storage is already cleared by Supabase, but we log it
      }
    })
  }

  return browserClient
}

// REMOVED: Direct export was creating singleton at module load time, before logout flag could be checked
// This caused logout issues where the old session persisted in the singleton
// All components should use createClient() directly instead
// export const supabase = createClient()
