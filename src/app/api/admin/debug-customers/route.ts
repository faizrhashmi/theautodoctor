/**
 * DEBUG ROUTE: Investigate customer data
 * Temporary route to debug why customers aren't showing
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // 1. Check all profiles with role='customer'
    const { data: customerProfiles, error: profilesError, count: profileCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(50);

    results.checks.customerProfiles = {
      count: profileCount,
      error: profilesError?.message,
      sample: customerProfiles?.slice(0, 5).map(p => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        role: p.role,
        account_status: p.account_status,
        email_verified: p.email_verified,
        created_at: p.created_at,
      })),
    };

    // 2. Check ALL profiles (any role)
    const { data: allProfiles, count: allCount } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name', { count: 'exact' })
      .limit(10);

    results.checks.allProfiles = {
      total_count: allCount,
      roles_breakdown: allProfiles?.reduce((acc: any, p) => {
        acc[p.role || 'null'] = (acc[p.role || 'null'] || 0) + 1;
        return acc;
      }, {}),
      sample: allProfiles,
    };

    // 3. Check auth.users for emails with cust
    let authUsers: any[] = [];
    let pageIndex = 1;
    const perPage = 100;
    while (pageIndex <= 5) {
      const { data: page, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: pageIndex,
        perPage,
      });

      if (authError) {
        results.checks.authUsersError = authError.message;
        break;
      }

      if (page && page.users) {
        authUsers = authUsers.concat(page.users);
      }

      if (!page || page.users.length < perPage) {
        break;
      }

      pageIndex++;
    }

    // Filter for customers mentioned
    const custUsers = authUsers.filter(u =>
      u.email?.includes('cust') || u.email?.includes('test')
    );

    results.checks.authUsers = {
      total_fetched: authUsers.length,
      matching_cust_test: custUsers.length,
      cust_emails: custUsers.map(u => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        created_at: u.created_at,
        role: u.role,
      })),
    };

    // 4. Check if these users have profiles
    if (custUsers.length > 0) {
      const custUserIds = custUsers.map(u => u.id);
      const { data: matchingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', custUserIds);

      results.checks.profilesForCustUsers = {
        found: matchingProfiles?.length || 0,
        profiles: matchingProfiles,
      };
    }

    // 5. Check sessions table for customer activity
    const { count: sessionCount } = await supabaseAdmin
      .from('sessions')
      .select('customer_user_id', { count: 'exact', head: true });

    results.checks.sessions = {
      total_sessions: sessionCount,
    };

    // 6. Try the EXACT query that the customers API uses (FIXED)
    const { data: apiQuery, error: apiError, count: apiCount } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone,
        role,
        account_status,
        email_verified,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(0, 19);

    results.checks.exactAPIQuery = {
      count: apiCount,
      error: apiError?.message,
      results: apiQuery,
    };

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('Debug route error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
