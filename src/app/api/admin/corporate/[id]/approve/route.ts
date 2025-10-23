// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  _request: NextRequest,
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

    // Update corporate business to approved
    const { data: updatedBusiness, error: updateError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .update({
        approval_status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', corporateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving corporate business:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve account' },
        { status: 500 }
      );
    }

    // TODO: Send approval email to primary contact
    // TODO: Send welcome email with onboarding instructions

    return NextResponse.json({
      success: true,
      message: 'Corporate account approved successfully',
      business: updatedBusiness,
    });
  } catch (error) {
    console.error('Approve corporate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
