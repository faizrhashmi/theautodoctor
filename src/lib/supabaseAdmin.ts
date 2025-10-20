// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
