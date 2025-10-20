// src/app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => req.cookies.get(name)?.value,
          set: (name, value, options) => {
            res.cookies.set({ name, value, ...options });
          },
          remove: (name, options) => {
            res.cookies.set({ name, value: '', maxAge: 0, ...options });
          },
        },
      }
    );

    await supabase.auth.signOut();
    return res;
  } catch (e: any) {
    console.error('POST /api/admin/logout error:', e?.message || e);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
