import { createClient as createBrowserClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  if (!url || !key) {
    console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_* environment variables')
    throw new Error('Supabase client cannot be instantiated without URL and anon key')
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, key, {
      auth: {
        // CRITICAL: Match middleware configuration
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Use same storage key as middleware cookies
        storageKey: 'sb-access-token',
        
        // Custom storage that syncs with middleware cookies
        storage: {
          getItem: (key: string) => {
            if (typeof document === 'undefined') return null
            
            // First try to get from cookies (matches middleware)
            const cookies = document.cookie.split(';').reduce((acc, cookie) => {
              const [name, value] = cookie.trim().split('=')
              acc[name] = decodeURIComponent(value)
              return acc
            }, {} as Record<string, string>)
            
            if (cookies[key]) {
              console.log(`[Supabase Client] Reading ${key} from cookies`)
              return cookies[key]
            }
            
            // Fallback to localStorage for backward compatibility
            try {
              const item = localStorage.getItem(key)
              if (item) {
                console.log(`[Supabase Client] Reading ${key} from localStorage`)
              }
              return item
            } catch {
              return null
            }
          },
          
          setItem: (key: string, value: string) => {
            if (typeof document === 'undefined') return
            
            // Set cookie with same settings as middleware
            const isProduction = process.env.NODE_ENV === 'production'
            const cookieSettings = [
              `path=/`,
              `max-age=604800`, // 7 days - match middleware
              `samesite=lax`,
              ...(isProduction ? ['secure'] : [])
            ].join('; ')
            
            document.cookie = `${key}=${encodeURIComponent(value)}; ${cookieSettings}`
            console.log(`[Supabase Client] Set ${key} cookie`)
            
            // Also store in localStorage for compatibility
            try {
              localStorage.setItem(key, value)
            } catch (error) {
              console.warn('LocalStorage not available:', error)
            }
          },
          
          removeItem: (key: string) => {
            if (typeof document === 'undefined') return
            
            // Clear cookie (match middleware removal)
            document.cookie = `${key}=; path=/; max-age=0`
            
            // Also clear from localStorage
            try {
              localStorage.removeItem(key)
            } catch (error) {
              console.warn('LocalStorage not available:', error)
            }
          }
        }
      },
      global: {
        headers: {
          'X-Client': 'browser'
        }
      }
    })

    // Add debug logging in development
    if (process.env.NODE_ENV === 'development') {
      browserClient.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase Client] Auth state changed:', event, session?.user?.email)
        
        // Log cookie state for debugging
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=')
            acc[name] = value ? 'PRESENT' : 'MISSING'
            return acc
          }, {} as Record<string, string>)
          
          console.log('[Supabase Client] Current cookies:', cookies)
        }
      })
    }
  }

  return browserClient
}

/**
 * Clear all auth storage (cookies + localStorage)
 */
export function clearAuthStorage() {
  if (typeof document === 'undefined') return
  
  // Clear all Supabase-related cookies (match middleware)
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'autodoctor.auth.token'
  ]
  
  cookieNames.forEach(name => {
    document.cookie = `${name}=; path=/; max-age=0`
    console.log(`[Supabase] Cleared cookie: ${name}`)
  })
  
  // Clear localStorage
  try {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token') 
    localStorage.removeItem('autodoctor.auth.token')
  } catch (error) {
    console.warn('LocalStorage clear failed:', error)
  }
}