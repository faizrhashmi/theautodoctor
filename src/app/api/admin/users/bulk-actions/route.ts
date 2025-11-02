import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const BulkActionSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, 'At least one user must be selected').max(50, 'Maximum 50 users per bulk action'),
  action: z.enum(['verify_email', 'suspend', 'reactivate', 'delete'], {
    errorMap: () => ({ message: 'Action must be verify_email, suspend, reactivate, or delete' })
  }),
  reason: z.string().min(1, 'Reason is required for bulk actions').max(500),
  // For suspend action only
  duration_days: z.number().int().positive().optional(),
});

type BulkActionInput = z.infer<typeof BulkActionSchema>;

export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req);
    if (authResult.error) {
      return authResult.error;
    }

    const admin = authResult.data;

    // Parse and validate request body
    const body = await req.json();
    const validation = BulkActionSchema.safeParse(body);

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

    const data: BulkActionInput = validation.data;
    const { user_ids, action, reason, duration_days } = data;

    console.log(`[BULK ACTION] Admin ${admin.email} performing ${action} on ${user_ids.length} users`);

    // ✅ SECURITY: Prevent admin from performing bulk actions on themselves
    if (user_ids.includes(admin.id)) {
      return NextResponse.json(
        { error: 'Cannot perform bulk actions on your own account' },
        { status: 403 }
      );
    }

    // ✅ SECURITY: For delete action, ensure at least 1 admin remains
    if (action === 'delete') {
      const { data: targetUsers } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .in('id', user_ids);

      const adminUsersInSelection = targetUsers?.filter(u => u.role === 'admin') || [];

      if (adminUsersInSelection.length > 0) {
        // Check total admin count
        const { count: totalAdminCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
          .is('deleted_at', null);

        if (totalAdminCount && totalAdminCount - adminUsersInSelection.length < 1) {
          return NextResponse.json(
            { error: 'Cannot delete all admins. At least 1 admin must remain.' },
            { status: 403 }
          );
        }
      }
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ user_id: string; error: string }>,
    };

    // Perform bulk action based on type
    switch (action) {
      case 'verify_email': {
        for (const userId of user_ids) {
          try {
            // Update profile
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({ email_verified: true, updated_at: new Date().toISOString() })
              .eq('id', userId);

            if (profileError) throw profileError;

            // Update auth metadata
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              email_confirm: true,
            });

            // Log action
            await supabaseAdmin.from('admin_actions').insert({
              admin_id: admin.id,
              target_user_id: userId,
              action_type: 'VERIFY_EMAIL',
              reason: `Bulk verify: ${reason}`,
              metadata: {
                admin_email: admin.email,
                bulk_action: true,
                timestamp: new Date().toISOString(),
              },
            });

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push({ user_id: userId, error: err.message });
          }
        }
        break;
      }

      case 'suspend': {
        const durationDays = duration_days || 7;
        const suspendedUntil = new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);

        for (const userId of user_ids) {
          try {
            // Update profile
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({
                account_status: 'suspended',
                suspended_until: suspendedUntil.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (profileError) throw profileError;

            // Update mechanic record if exists
            await supabaseAdmin
              .from('mechanics')
              .update({ account_status: 'suspended', suspended_until: suspendedUntil.toISOString() })
              .eq('user_id', userId);

            // Log action
            await supabaseAdmin.from('admin_actions').insert({
              admin_id: admin.id,
              target_user_id: userId,
              action_type: 'SUSPEND',
              reason: `Bulk suspend: ${reason}`,
              metadata: {
                admin_email: admin.email,
                bulk_action: true,
                duration_days: durationDays,
                suspended_until: suspendedUntil.toISOString(),
                timestamp: new Date().toISOString(),
              },
            });

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push({ user_id: userId, error: err.message });
          }
        }
        break;
      }

      case 'reactivate': {
        for (const userId of user_ids) {
          try {
            // Update profile
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({
                account_status: 'active',
                suspended_until: null,
                ban_reason: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (profileError) throw profileError;

            // Update mechanic record if exists
            await supabaseAdmin
              .from('mechanics')
              .update({ account_status: 'active', suspended_until: null, ban_reason: null })
              .eq('user_id', userId);

            // Log action
            await supabaseAdmin.from('admin_actions').insert({
              admin_id: admin.id,
              target_user_id: userId,
              action_type: 'REACTIVATE',
              reason: `Bulk reactivate: ${reason}`,
              metadata: {
                admin_email: admin.email,
                bulk_action: true,
                timestamp: new Date().toISOString(),
              },
            });

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push({ user_id: userId, error: err.message });
          }
        }
        break;
      }

      case 'delete': {
        for (const userId of user_ids) {
          try {
            // Soft delete: Set deleted_at timestamp and anonymize
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

            if (deleteError) throw deleteError;

            // Soft-delete mechanic record if exists
            await supabaseAdmin
              .from('mechanics')
              .update({
                account_status: 'deleted',
                deleted_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            // Log action
            await supabaseAdmin.from('admin_actions').insert({
              admin_id: admin.id,
              target_user_id: userId,
              action_type: 'DELETE_USER',
              reason: `Bulk delete: ${reason}`,
              metadata: {
                admin_email: admin.email,
                bulk_action: true,
                retention_days: 7,
                timestamp: new Date().toISOString(),
              },
            });

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push({ user_id: userId, error: err.message });
          }
        }
        break;
      }
    }

    console.log(`[BULK ACTION] ✅ Completed: ${results.success} success, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        total: user_ids.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[BULK ACTION] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
