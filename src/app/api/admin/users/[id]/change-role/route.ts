import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const ChangeRoleSchema = z.object({
  new_role: z.enum(['customer', 'mechanic', 'admin'], {
    errorMap: () => ({ message: 'Role must be customer, mechanic, or admin' })
  }),
  reason: z.string().min(1, 'Reason is required'),
});

type ChangeRoleInput = z.infer<typeof ChangeRoleSchema>;

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

    // PHASE 2: Prevent self-role-change
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = ChangeRoleSchema.safeParse(body);

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

    const { new_role, reason } = validation.data;

    // Get current user profile
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const oldRole = targetProfile.role;

    // No change needed
    if (oldRole === new_role) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 400 }
      );
    }

    // PHASE 2: If demoting from admin, ensure minimum 2 admins
    if (oldRole === 'admin' && new_role !== 'admin') {
      const { count: adminCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .is('deleted_at', null);

      if (adminCount && adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin. There must be at least 2 admins.' },
          { status: 403 }
        );
      }
    }

    console.log(`[CHANGE ROLE] Admin ${admin.email} changing user ${userId} role: ${oldRole} → ${new_role}`);

    // Update role in profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: new_role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[CHANGE ROLE] Profile update failed:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // SIDE EFFECT 1: If promoting to mechanic, create mechanics record
    if (new_role === 'mechanic' && oldRole !== 'mechanic') {
      const { error: mechanicError } = await supabaseAdmin
        .from('mechanics')
        .insert({
          id: userId,
          user_id: userId,
          name: targetProfile.full_name,
          email: targetProfile.email || '',
          account_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (mechanicError) {
        console.error('[CHANGE ROLE] Mechanic record creation failed:', mechanicError);
        // Don't rollback - profile updated successfully, just log the error
      } else {
        console.log(`[CHANGE ROLE] Created mechanics record for user ${userId}`);
      }
    }

    // SIDE EFFECT 2: If demoting from mechanic, soft-delete mechanic record
    if (oldRole === 'mechanic' && new_role !== 'mechanic') {
      const { error: mechanicDeleteError } = await supabaseAdmin
        .from('mechanics')
        .update({
          account_status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (mechanicDeleteError) {
        console.error('[CHANGE ROLE] Mechanic record soft-delete failed:', mechanicDeleteError);
      } else {
        console.log(`[CHANGE ROLE] Soft-deleted mechanics record for user ${userId}`);
      }
    }

    // Log admin action with before/after values
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'ROLE_CHANGE',
      reason: reason,
      metadata: {
        admin_email: admin.email,
        target_user_email: targetProfile.email,
        target_user_name: targetProfile.full_name,
        old_role: oldRole,
        new_role: new_role,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[CHANGE ROLE] ✅ Role changed successfully: ${oldRole} → ${new_role}`);

    return NextResponse.json({
      success: true,
      message: `User role changed from ${oldRole} to ${new_role}`,
      old_role: oldRole,
      new_role: new_role,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[CHANGE ROLE] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
