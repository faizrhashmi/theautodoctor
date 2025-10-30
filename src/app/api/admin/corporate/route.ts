// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(_request: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const supabase = getSupabaseServer();

    // Verify admin user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all corporate businesses with employee and vehicle counts
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .select(`
        *,
        employees:corporate_employees(count),
        vehicles:corporate_vehicles(count)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching corporate businesses:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch corporate accounts' },
        { status: 500 }
      );
    }

    // Transform the data to include counts
    const businessesWithCounts = (businesses as any[])?.map((business: any) => ({
      ...business,
      employee_count: business.employees?.[0]?.count || 0,
      vehicle_count: business.vehicles?.[0]?.count || 0,
    }));

    return NextResponse.json({ businesses: businessesWithCounts });
  } catch (error) {
    console.error('Admin corporate GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
