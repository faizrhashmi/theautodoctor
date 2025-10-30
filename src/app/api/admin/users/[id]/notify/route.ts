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
    if (!auth.authorized) {
      return auth.response!;
    }

    const userId = params.id;
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.warn(
      `[ADMIN ACTION] ${admin.email} sending notification to user ${userId}`
    );

    // Get user email
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'send_notification',
      metadata: {
        message,
        admin_name: admin.email || admin.email
      },
    });

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log the action
    console.log(`Notification to ${authUser.user.email}: ${message}`);

    return NextResponse.json({
      success: true,
      message: 'Notification logged. Email integration pending.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Send notification error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
