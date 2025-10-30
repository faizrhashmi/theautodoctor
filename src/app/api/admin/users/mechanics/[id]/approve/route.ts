// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req);
    if (authResult.error) return authResult.error;

    const admin = authResult.data;
    const mechanicId = params.id;
    console.log(`[ADMIN] ${admin.email} approving mechanic ${mechanicId}`);

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
      admin_id: admin.id,
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
