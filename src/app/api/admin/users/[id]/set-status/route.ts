import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const SetStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned', 'deleted'], {
    errorMap: () => ({ message: 'Status must be active, suspended, banned, or deleted' })
  }),
  reason: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
});

type SetStatusInput = z.infer<typeof SetStatusSchema>;

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

    // Parse and validate request body
    const body = await req.json();
    const validation = SetStatusSchema.safeParse(body);

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

    const { status, reason, duration_days } = validation.data;

    // Get current user profile
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name, email, account_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const oldStatus = targetProfile.account_status || 'active';

    // No change needed
    if (oldStatus === status) {
      return NextResponse.json(
        { message: 'User already has this status' },
        { status: 200 }
      );
    }

    console.log(`[SET STATUS] Admin ${admin.email} changing user ${userId} status: ${oldStatus} → ${status}`);

    // Prepare update data
    const updateData: any = {
      account_status: status,
      updated_at: new Date().toISOString(),
    };

    // Handle status-specific logic
    if (status === 'suspended') {
      // Calculate suspension end date
      const durationDays = duration_days || 7;
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);
      updateData.suspended_until = suspendedUntil.toISOString();
    } else if (status === 'active') {
      // Clear suspension and ban data when reactivating
      updateData.suspended_until = null;
      updateData.ban_reason = null;
    } else if (status === 'banned') {
      // Store ban reason
      updateData.ban_reason = reason || 'No reason provided';
      updateData.suspended_until = null;
    } else if (status === 'deleted') {
      // Soft delete
      updateData.deleted_at = new Date().toISOString();
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('[SET STATUS] Profile update failed:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // If user is a mechanic, mirror status to mechanics table
    if (targetProfile.role === 'mechanic') {
      const mechanicUpdate: any = {
        account_status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'suspended' && updateData.suspended_until) {
        mechanicUpdate.suspended_until = updateData.suspended_until;
      } else if (status === 'active') {
        mechanicUpdate.suspended_until = null;
        mechanicUpdate.ban_reason = null;
      } else if (status === 'banned') {
        mechanicUpdate.ban_reason = updateData.ban_reason;
      }

      await supabaseAdmin
        .from('mechanics')
        .update(mechanicUpdate)
        .eq('user_id', userId);
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'STATUS_CHANGE',
      reason: reason || `Status changed from ${oldStatus} to ${status}`,
      metadata: {
        admin_email: admin.email,
        target_user_email: targetProfile.email,
        target_user_name: targetProfile.full_name,
        old_status: oldStatus,
        new_status: status,
        suspended_until: updateData.suspended_until || null,
        ban_reason: updateData.ban_reason || null,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[SET STATUS] ✅ Status changed successfully: ${oldStatus} → ${status}`);

    const response: any = {
      success: true,
      message: `User status changed from ${oldStatus} to ${status}`,
      old_status: oldStatus,
      new_status: status,
    };

    if (status === 'suspended' && updateData.suspended_until) {
      response.suspended_until = updateData.suspended_until;
    }

    return NextResponse.json(response);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[SET STATUS] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
