// src/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function getSupabaseServer() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // createServerClient integrates with Next cookies
  const client = createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {
        // no-op for route handlers (Next handles set-cookie on response)
      },
      remove() {
        // no-op
      },
    },
  })

  return client
}
