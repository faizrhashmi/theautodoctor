// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY FIX: Require admin authentication
  const auth = await requireAdmin(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  if (!supabaseAdmin) return bad('Supabase not configured', 500);

  try {
    const { notes } = await req.json();
    const mechanicId = params.id;

    console.warn(
      `[ADMIN ACTION] ${auth.profile?.full_name} rejecting mechanic ${mechanicId} - Reason: ${notes}`
    );

    if (!notes || notes.trim().length === 0) {
      return bad('Rejection reason is required');
    }

    // Update mechanic status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        application_status: 'rejected',
        background_check_status: 'rejected',
        approval_notes: notes,
        reviewed_by: auth.user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', mechanicId);

    if (updateError) {
      console.error('[ADMIN] Failed to reject:', updateError);
      return bad('Failed to reject application', 500);
    }

    // Log admin action
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mechanicId,
      admin_id: auth.user!.id,
      action_type: 'rejected',
      notes,
      metadata: {
        rejected_at: new Date().toISOString(),
        admin_name: auth.profile?.full_name || auth.profile?.email
      },
    });

    // TODO: Send rejection email to mechanic with reason

    console.log('[ADMIN] Mechanic rejected:', mechanicId);

    return NextResponse.json({
      success: true,
      message: 'Application rejected',
    });
  } catch (e: any) {
    console.error('[ADMIN] Error rejecting application:', e);
    return bad(e.message || 'Failed to reject', 500);
  }
}
