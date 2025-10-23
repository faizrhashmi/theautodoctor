// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get auth user for email
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Get admin notes
    const { data: notesData } = await supabaseAdmin
      .from('admin_notes')
      .select(`
        id,
        created_at,
        note,
        admin_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Get admin actions
    const { data: actionsData } = await supabaseAdmin
      .from('admin_actions' as any)
      .select(`
        id,
        created_at,
        action_type,
        reason,
        duration_days,
        metadata,
        admin_id
      `)
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false });

    // Enrich notes and actions with admin emails
    const adminIds = [
      ...(notesData?.map(n => n.admin_id) || []),
      ...(actionsData?.map(a => a.admin_id) || []),
    ];
    const uniqueAdminIds = [...new Set(adminIds)];

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || []);

    const notes = notesData?.map(note => ({
      ...note,
      admin_email: emailMap.get(note.admin_id) || 'Unknown',
    })) || [];

    const actions = actionsData?.map(action => ({
      ...action,
      admin_email: emailMap.get(action.admin_id) || 'Unknown',
    })) || [];

    // Get session stats
    const { count: sessionCount } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId);

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'succeeded');

    const totalSpent = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return NextResponse.json({
      user: {
        ...profile,
        email: authUser?.user?.email || '',
        total_sessions: sessionCount || 0,
        total_spent: totalSpent / 100,
      },
      notes,
      actions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Admin user detail route error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
