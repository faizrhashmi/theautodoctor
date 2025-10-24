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
        storageKey: 'autodoctor.auth.token',
      },
    })
  }

  return browserClient
}

// Convenience export (some components import `supabase` directly)
// We instantiate here so existing code that expects a client instance continues to work.
// If env vars are missing this may throw at import time — that's consistent with prior runtime behavior.
export const supabase = createClient()
