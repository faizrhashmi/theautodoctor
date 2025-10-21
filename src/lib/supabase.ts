import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export const createClient = () => {
  // Only create a singleton in the browser, never on the server
  if (typeof window === 'undefined') {
    // Server-side: always create a new client
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Browser-side: reuse the same client instance
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return browserClient
}

// Deprecated: Use createClient() instead to avoid sharing instances
// @deprecated
export const supabase = createClient()
