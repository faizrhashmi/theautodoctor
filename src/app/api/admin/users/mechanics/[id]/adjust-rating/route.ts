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
    const body = await req.json();
    const { rating } = body;

    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 0 and 5' },
        { status: 400 }
      );
    }

    console.log(`[ADMIN] ${admin.email} adjusting mechanic ${mechanicId} rating to ${rating}`);

    // Update mechanic rating
    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update({ rating })
      .eq('id', mechanicId);

    if (updateError) {
      console.error('Error adjusting rating:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions' as any).insert({
      admin_id: admin.id,
      target_user_id: mechanicId,
      action_type: 'adjust_rating',
      metadata: { rating },
    });

    return NextResponse.json({ success: true, rating });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Adjust rating error', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
