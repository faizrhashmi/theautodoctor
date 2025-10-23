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
    const userId = params.id;

    // Get current admin user
    const supabase = getSupabaseServer();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', userId);

    if (updateError) {
      console.error('Error verifying email:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update auth user metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (authError) {
      console.error('Error updating auth user:', authError);
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: adminUser.id,
      target_user_id: userId,
      action_type: 'verify_email',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Verify email error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
