// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY FIX: Use requireAdmin helper
    const auth = await requireAdmin(_request);
    if (!auth.authorized) {
      return auth.response!;
    }

    const corporateId = params.id;

    console.warn(
      `[ADMIN ACTION] ${auth.profile?.full_name} approving corporate account ${corporateId}`
    );

    // Update corporate business to approved
    const { data: updatedBusiness, error: updateError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .update({
        approval_status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: auth.user!.id,
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
