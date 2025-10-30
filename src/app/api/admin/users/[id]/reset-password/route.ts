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
    const userId = params.id;

    // Get user email
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate password reset link
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }

    // Log admin action
    console.warn(
      `[ADMIN ACTION] ${admin.email} reset password for user ${userId}`
    );

    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'reset_password',
      metadata: {
        admin_name: admin.email
      }
    });

    // In production, you would send this link via email
    // For now, return it in the response
    return NextResponse.json({
      success: true,
      reset_link: data.properties?.action_link,
      message: 'Password reset link generated. In production, this would be sent via email.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Reset password error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
