// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

// Ensure a single instance in dev (Next.js hot reload)
let _admin: SupabaseClient<Database>;

export const supabaseAdmin: SupabaseClient<Database> =
  _admin ??
  createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });

export function getSupabaseAdmin() {
  return supabaseAdmin;
}
