// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();

    // Verify admin user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const corporateId = params.id;
    const body = await request.json();
    const { reason } = body;

    // Update corporate business to rejected
    const { data: updatedBusiness, error: updateError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .update({
        approval_status: 'rejected',
        is_active: false,
        rejection_reason: reason,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', corporateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting corporate business:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject application' },
        { status: 500 }
      );
    }

    // TODO: Send rejection email to primary contact

    return NextResponse.json({
      success: true,
      message: 'Application rejected',
      business: updatedBusiness,
    });
  } catch (error) {
    console.error('Reject corporate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
