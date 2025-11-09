// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const mechanicId = params.id;

    // Get mechanic with workshop details
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        *,
        workshop:workshop_id (
          id,
          name,
          created_by
        )
      `)
      .eq('id', mechanicId)
      .single();

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 });
    }

    // Calculate mechanic type classification
    let mechanicType = 'VIRTUAL_ONLY'
    if (mechanic.workshop_id) {
      const isOwner = mechanic.workshop?.created_by === mechanic.user_id
      mechanicType = isOwner ? 'INDEPENDENT_WORKSHOP' : 'WORKSHOP_AFFILIATED'
    }

    // Get admin notes
    const { data: notesData } = await supabaseAdmin
      .from('admin_notes')
      .select(`
        id,
        created_at,
        note,
        admin_id
      `)
      .eq('user_id', mechanicId)
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
      .eq('target_user_id', mechanicId)
      .order('created_at', { ascending: false });

    // Enrich with admin emails
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

    return NextResponse.json({
      mechanic,
      notes,
      actions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Admin mechanic detail route error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
