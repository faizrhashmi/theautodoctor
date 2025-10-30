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
    if (!auth.authorized) {
      return auth.response!;
    }
    const url = new URL(req.url);

    // Pagination
    const page = clamp(parsePositiveInt(url.searchParams.get('page'), 1), 1, 10000);
    const pageSize = clamp(parsePositiveInt(url.searchParams.get('pageSize'), 20), 1, 200);

    // Filters
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || '';
    const emailVerified = url.searchParams.get('emailVerified');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Base query - get users with customer role
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        role,
        account_status,
        email_verified,
        created_at,
        last_active_at,
        suspended_until,
        ban_reason
      `, { count: 'exact' })
      .eq('role', 'customer');

    // Search across name, email, phone
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    // Filters
    if (status) query = query.eq('account_status', status);
    if (emailVerified === 'true') query = query.eq('email_verified', true);
    if (emailVerified === 'false') query = query.eq('email_verified', false);
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00Z`).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59Z`).toISOString());

    // Pagination
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(fromIndex, toIndex);

    const { data: profiles, count, error: profilesError } = await query;

    if (profilesError) {
      console.error('Supabase profiles query error', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get user emails from auth.users
    const userIds = profiles?.map(p => p.id) || [];
    const emailMap = new Map<string, string>();
    let pageIndex = 1;
    const perPage = 100;
    while (true) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: pageIndex,
        perPage,
      });

      if (authError) {
        console.error('Auth users query error', authError);
        break;
      }

      authUsers?.users.forEach((user) => {
        if (user.id) {
          emailMap.set(user.id, user.email || '');
        }
      });

      if (!authUsers || authUsers.users.length < perPage) {
        break;
      }

      pageIndex += 1;
      if (pageIndex > 20) {
        console.warn('Reached auth users pagination guard limit');
        break;
      }
    }

    // Enrich profiles with emails and session stats
    const enrichedProfiles = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Get session count and total spent
        const { count: sessionCount } = await supabaseAdmin
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('customer_user_id', profile.id);

        const { data: payments } = await supabaseAdmin
          .from('payments')
          .select('amount')
          .eq('user_id', profile.id)
          .eq('status', 'succeeded');

        const totalSpent = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        return {
          ...profile,
          email: emailMap.get(profile.id) || '',
          total_sessions: sessionCount || 0,
          total_spent: totalSpent / 100, // Convert cents to dollars
        };
      })
    );

    return NextResponse.json({
      rows: enrichedProfiles,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Admin customers query route error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
