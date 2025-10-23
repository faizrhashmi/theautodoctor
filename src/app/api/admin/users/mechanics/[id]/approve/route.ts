// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mechanicId = params.id;

    // Get current admin user
    const supabase = getSupabaseServer();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update mechanic approval status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({ approval_status: 'approved' })
      .eq('id', mechanicId);

    if (updateError) {
      console.error('Error approving mechanic:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: adminUser.id,
      target_user_id: mechanicId,
      action_type: 'approve_mechanic',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Approve mechanic error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
