// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userType = url.searchParams.get('type') || 'customers'; // 'customers' or 'mechanics'

    let data: any[] = [];

    if (userType === 'customers') {
      // Get all customer profiles
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Get auth users for emails
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || []);

      data = (profiles || []).map(p => ({
        id: p.id,
        email: emailMap.get(p.id) || '',
        full_name: p.full_name || '',
        phone: p.phone || '',
        account_status: p.account_status,
        email_verified: p.email_verified,
        created_at: p.created_at,
        last_active_at: p.last_active_at || '',
      }));
    } else if (userType === 'mechanics') {
      // Get all mechanics
      const { data: mechanics, error } = await supabaseAdmin
        .from('mechanics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      data = mechanics || [];
    }

    // Convert to CSV
    if (data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }

    const headers = Object.keys(data[0]);
    const csvLines = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
          })
          .join(',')
      ),
    ];

    const csv = csvLines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${userType}-export-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Export users error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
