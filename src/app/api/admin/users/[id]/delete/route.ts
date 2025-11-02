import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const DeleteUserSchema = z.object({
  confirmation: z.string().refine(val => val === 'DELETE', {
    message: 'Must type DELETE to confirm'
  }),
  reason: z.string().min(1, 'Deletion reason is required'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req);
    if (authResult.error) {
      return authResult.error;
    }

    const admin = authResult.data;
    const userId = params.id;

    // Prevent self-deletion
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = DeleteUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    // Check if user exists and is an admin
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name, email, account_status, deleted_at')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already deleted
    if (targetProfile.deleted_at) {
      return NextResponse.json(
        { error: 'User is already deleted' },
        { status: 400 }
      );
    }

    // Prevent deletion of last admin
    if (targetProfile.role === 'admin') {
      const { count: adminCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .is('deleted_at', null);

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin account' },
          { status: 403 }
        );
      }
    }

    console.log(`[SOFT DELETE] Admin ${admin.email} deleting user ${userId} - Reason: ${reason}`);

    // Soft delete: Set deleted_at timestamp and anonymize data
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        account_status: 'deleted',
        full_name: 'Deleted User',
        phone: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (deleteError) {
      console.error('[SOFT DELETE] Profile update failed:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // If user is a mechanic, also soft delete mechanic record
    if (targetProfile.role === 'mechanic') {
      await supabaseAdmin
        .from('mechanics')
        .update({
          account_status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'DELETE_USER',
      reason: reason,
      metadata: {
        admin_email: admin.email,
        deleted_user_role: targetProfile.role,
        deleted_user_name: targetProfile.full_name,
        soft_delete: true,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[SOFT DELETE] ✅ User ${userId} soft deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `User ${targetProfile.full_name || 'Deleted User'} has been deleted`,
      deleted_at: new Date().toISOString(),
      note: 'This is a soft delete. User data is anonymized but retained for 7 days (PIPEDA compliance).',
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[SOFT DELETE] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
