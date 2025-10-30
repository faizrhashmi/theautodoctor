// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  if (!supabaseAdmin) return bad('Supabase not configured', 500);

  try {
    const { notes } = await req.json();
    const mechanicId = params.id;

    console.warn(
      `[ADMIN ACTION] ${admin.email} approving mechanic ${mechanicId}`
    );

    // Update mechanic status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        application_status: 'approved',
        background_check_status: 'approved',
        approved_at: new Date().toISOString(),
        approval_notes: notes || 'Application approved',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', mechanicId);

    if (updateError) {
      console.error('[ADMIN] Failed to approve:', updateError);
      return bad('Failed to approve application', 500);
    }

    // Log admin action
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mechanicId,
      admin_id: admin.id,
      action_type: 'approved',
      notes: notes || 'Application approved',
      metadata: {
        approved_at: new Date().toISOString(),
        admin_name: admin.email || admin.email
      },
    });

    // TODO: Send approval email to mechanic
    // TODO: Send notification about Stripe Connect onboarding

    console.log('[ADMIN] Mechanic approved:', mechanicId);

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully',
    });
  } catch (e: any) {
    console.error('[ADMIN] Error approving application:', e);
    return bad(e.message || 'Failed to approve', 500);
  }
}
