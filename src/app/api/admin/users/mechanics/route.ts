// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value ?? '');
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req);
    if (authResult.error) return authResult.error;

    const admin = authResult.data;

    const url = new URL(req.url);

    // Pagination
    const page = clamp(parsePositiveInt(url.searchParams.get('page'), 1), 1, 10000);
    const pageSize = clamp(parsePositiveInt(url.searchParams.get('pageSize'), 20), 1, 200);

    // Filters
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || '';
    const approvalStatus = url.searchParams.get('approvalStatus') || '';
    const onlineOnly = url.searchParams.get('onlineOnly') === 'true';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Base query
    let query = supabaseAdmin
      .from('mechanics')
      .select('*', { count: 'exact' });

    // Search across name, email, phone
    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    // Filters
    if (status) query = query.eq('account_status', status);
    if (approvalStatus) query = query.eq('approval_status', approvalStatus);
    if (onlineOnly) query = query.eq('is_online', true);
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00Z`).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59Z`).toISOString());

    // Pagination
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (error) {
      console.error('Supabase mechanics query error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rows: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Admin mechanics query route error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
