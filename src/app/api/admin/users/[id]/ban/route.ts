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
    const userId = params.id;
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // Log the ban action
    console.warn(
      `[ADMIN ACTION] ${admin.email} banning user ${userId} - Reason: ${reason}`
    );

    // Update user profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        account_status: 'banned',
        ban_reason: reason,
      } as any)
      .eq('id', userId);

    if (updateError) {
      console.error('Error banning user:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update mechanics table if user is a mechanic
    await supabaseAdmin
      .from('mechanics')
      .update({
        account_status: 'banned',
        ban_reason: reason,
      })
      .eq('id', userId);

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'ban',
      reason,
      metadata: {
        admin_name: admin.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Ban user error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
