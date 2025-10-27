// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY FIX: Require admin authentication
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return auth.response!;
    }

    const userId = params.id;
    const body = await req.json();
    const { reason, duration_days } = body;

    if (!reason || !duration_days) {
      return NextResponse.json(
        { error: 'Reason and duration are required' },
        { status: 400 }
      );
    }

    // Log the suspension action
    console.warn(
      `[ADMIN ACTION] ${auth.profile?.full_name || auth.profile?.email} suspending user ${userId} for ${duration_days} days - Reason: ${reason}`
    );

    // Calculate suspension end date
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + parseInt(duration_days));

    // Update user profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        account_status: 'suspended',
        suspended_until: suspendedUntil.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error suspending user:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update mechanics table if user is a mechanic
    await supabaseAdmin
      .from('mechanics')
      .update({
        account_status: 'suspended',
        suspended_until: suspendedUntil.toISOString(),
      })
      .eq('id', userId);

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: adminUser.id,
      target_user_id: userId,
      action_type: 'suspend',
      reason,
      duration_days: parseInt(duration_days),
      metadata: { suspended_until: suspendedUntil.toISOString() },
    });

    return NextResponse.json({
      success: true,
      suspended_until: suspendedUntil.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Suspend user error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
