import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req);
    if (authResult.error) {
      return authResult.error;
    }

    const admin = authResult.data;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const actionType = searchParams.get('actionType') || '';
    const adminId = searchParams.get('adminId') || '';
    const targetUserId = searchParams.get('targetUserId') || '';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const search = searchParams.get('q') || ''; // Search in reason or metadata

    console.log(`[AUDIT LOG] Admin ${admin.email} querying audit log (page ${page})`);

    // Build query
    let query = supabaseAdmin
      .from('admin_actions')
      .select(`
        id,
        admin_id,
        target_user_id,
        action_type,
        reason,
        metadata,
        created_at,
        admin:admin_id(id, email, full_name),
        target:target_user_id(id, email, full_name, role)
      `, { count: 'exact' });

    // Apply filters
    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    if (targetUserId) {
      query = query.eq('target_user_id', targetUserId);
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    if (toDate) {
      // Add one day to include the entire end date
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    if (search) {
      query = query.or(`reason.ilike.%${search}%,metadata->>'admin_email'.ilike.%${search}%,metadata->>'target_user_email'.ilike.%${search}%`);
    }

    // Sort by most recent first
    query = query.order('created_at', { ascending: false });

    // Pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: actions, error: queryError, count } = await query;

    if (queryError) {
      throw queryError;
    }

    console.log(`[AUDIT LOG] ✅ Found ${count || 0} actions (returning ${actions?.length || 0})`);

    return NextResponse.json({
      rows: actions || [],
      total: count || 0,
      page,
      pageSize,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[AUDIT LOG] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
