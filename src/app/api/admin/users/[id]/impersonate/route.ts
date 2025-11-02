import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const ImpersonateSchema = z.object({
  reason: z.string().min(1, 'Reason for impersonation is required').max(500),
  duration_minutes: z.number().int().positive().max(60).optional(), // Max 60 minutes
});

type ImpersonateInput = z.infer<typeof ImpersonateSchema>;

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
    const targetUserId = params.id;

    // Parse and validate request body
    const body = await req.json();
    const validation = ImpersonateSchema.safeParse(body);

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

    const data: ImpersonateInput = validation.data;
    const durationMinutes = data.duration_minutes || 30; // Default 30 minutes

    console.log(`[IMPERSONATE] Admin ${admin.email} attempting to impersonate user ${targetUserId}`);

    // ✅ SECURITY: Cannot impersonate yourself
    if (targetUserId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot impersonate your own account' },
        { status: 403 }
      );
    }

    // Fetch target user profile
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, account_status, deleted_at')
      .eq('id', targetUserId)
      .maybeSingle();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // ✅ SECURITY: Cannot impersonate other admins
    if (targetUser.role === 'admin') {
      console.warn(`[SECURITY] 🚫 Admin ${admin.email} attempted to impersonate another admin ${targetUser.email}`);
      return NextResponse.json(
        { error: 'Cannot impersonate other administrators for security reasons' },
        { status: 403 }
      );
    }

    // ✅ SECURITY: Cannot impersonate deleted users
    if (targetUser.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot impersonate deleted users' },
        { status: 403 }
      );
    }

    // ✅ SECURITY: Cannot impersonate banned users (allowed for suspended for troubleshooting)
    if (targetUser.account_status === 'banned') {
      return NextResponse.json(
        { error: 'Cannot impersonate banned users' },
        { status: 403 }
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    // Create impersonation session in database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('impersonation_sessions')
      .insert({
        admin_id: admin.id,
        target_user_id: targetUserId,
        reason: data.reason,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      // If table doesn't exist, create it first (idempotent)
      if (sessionError.code === '42P01') {
        console.log('[IMPERSONATE] Creating impersonation_sessions table...');

        // Create table
        await supabaseAdmin.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              admin_id UUID NOT NULL REFERENCES auth.users(id),
              target_user_id UUID NOT NULL REFERENCES auth.users(id),
              reason TEXT NOT NULL,
              expires_at TIMESTAMPTZ NOT NULL,
              ended_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE,
              CONSTRAINT fk_target FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON public.impersonation_sessions(admin_id);
            CREATE INDEX IF NOT EXISTS idx_impersonation_target ON public.impersonation_sessions(target_user_id);
            CREATE INDEX IF NOT EXISTS idx_impersonation_expires ON public.impersonation_sessions(expires_at);
          `
        });

        // Retry insert
        const { data: retrySession, error: retryError } = await supabaseAdmin
          .from('impersonation_sessions')
          .insert({
            admin_id: admin.id,
            target_user_id: targetUserId,
            reason: data.reason,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (retryError) {
          throw retryError;
        }
      } else {
        throw sessionError;
      }
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      target_user_id: targetUserId,
      action_type: 'IMPERSONATE',
      reason: data.reason,
      metadata: {
        admin_email: admin.email,
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
        duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[IMPERSONATE] ✅ Session created: ${admin.email} → ${targetUser.email} (expires in ${durationMinutes}m)`);

    // Generate impersonation token (JWT or session ID)
    // For simplicity, we'll use the session ID
    const impersonationToken = session?.id || crypto.randomUUID();

    // Determine redirect URL based on target user role
    const redirectUrl = targetUser.role === 'mechanic'
      ? '/mechanic/dashboard'
      : '/customer/dashboard';

    return NextResponse.json({
      success: true,
      message: `Impersonation session created for ${targetUser.full_name || targetUser.email}`,
      session: {
        id: impersonationToken,
        target_user: {
          id: targetUser.id,
          email: targetUser.email,
          full_name: targetUser.full_name,
          role: targetUser.role,
        },
        expires_at: expiresAt.toISOString(),
        redirect_url: redirectUrl,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[IMPERSONATE] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// End impersonation session
export async function DELETE(
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
    const sessionId = params.id;

    console.log(`[IMPERSONATE] Admin ${admin.email} ending impersonation session ${sessionId}`);

    // End the session
    const { error: updateError } = await supabaseAdmin
      .from('impersonation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('admin_id', admin.id); // Ensure admin can only end their own sessions

    if (updateError) {
      throw updateError;
    }

    console.log(`[IMPERSONATE] ✅ Session ${sessionId} ended`);

    return NextResponse.json({
      success: true,
      message: 'Impersonation session ended',
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[IMPERSONATE] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
