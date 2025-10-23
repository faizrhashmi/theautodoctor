// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500);

  try {
    const { notes } = await req.json();
    const mechanicId = params.id;

    console.log('[ADMIN] Requesting additional info for mechanic:', mechanicId);

    if (!notes || notes.trim().length === 0) {
      return bad('Please specify what additional information is needed');
    }

    // Update mechanic status
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({
        application_status: 'additional_info_required',
        approval_notes: notes,
        reviewed_by: 'admin', // TODO: Get actual admin ID from session
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', mechanicId);

    if (updateError) {
      console.error('[ADMIN] Failed to request info:', updateError);
      return bad('Failed to request additional information', 500);
    }

    // Log admin action
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mechanicId,
      admin_id: 'admin', // TODO: Get actual admin ID
      action_type: 'info_requested',
      notes,
      metadata: {
        requested_at: new Date().toISOString(),
      },
    });

    // TODO: Send email to mechanic requesting additional information

    console.log('[ADMIN] Additional info requested for mechanic:', mechanicId);

    return NextResponse.json({
      success: true,
      message: 'Additional information requested',
    });
  } catch (e: any) {
    console.error('[ADMIN] Error requesting info:', e);
    return bad(e.message || 'Failed to request information', 500);
  }
}
