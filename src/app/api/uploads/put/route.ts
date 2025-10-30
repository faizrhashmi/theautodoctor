// src/app/api/uploads/put/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: NextRequest) {
  // ✅ SECURITY: Verify user is authenticated using Supabase Auth (unified)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Reject if not authenticated
  if (!user || authError) {
    console.warn('[Upload PUT] Unauthorized upload attempt:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized: You must be authenticated to upload files' }, { status: 401 });
  }

  console.log('[Upload PUT] User authenticated:', user.id);

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  // Read the uploaded data
  const buffer = await req.arrayBuffer();

  // TODO: Upload `buffer` to your storage (e.g., Supabase Storage) here.
  // This stub responds OK so the front-end flow can proceed without errors.
  return NextResponse.json({ ok: true, path, bytes: buffer.byteLength }, { status: 200 });
}
