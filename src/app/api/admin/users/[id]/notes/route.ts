// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const userId = params.id;
    const body = await req.json();
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    // Get current admin user
    const supabase = getSupabaseServer();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert note
    const { data, error: insertError } = await supabaseAdmin
      .from('admin_notes')
      .insert({
        user_id: userId,
        admin_id: adminUser.id,
        note: note.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding note:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Add note error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
