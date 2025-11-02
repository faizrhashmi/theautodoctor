import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminAPI } from '@/lib/auth/guards';
import { z } from 'zod';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  role: z.enum(['customer', 'mechanic', 'admin'], {
    errorMap: () => ({ message: 'Role must be customer, mechanic, or admin' })
  }),
  auto_verify: z.boolean().optional().default(false),
  send_email: z.boolean().optional().default(false),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function generateSecurePassword(): string {
  // Generate a random 16-character password with uppercase, lowercase, numbers, and symbols
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+';
  const all = uppercase + lowercase + numbers + symbols;

  const password = Array.from(randomBytes(16))
    .map(byte => all[byte % all.length])
    .join('');

  // Ensure at least one of each character type
  return (
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    symbols[Math.floor(Math.random() * symbols.length)] +
    password.slice(4)
  );
}

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
    const validation = CreateUserSchema.safeParse(body);

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

    const data: CreateUserInput = validation.data;

    // Generate password if not provided
    const password = data.password || generateSecurePassword();
    const generatedPassword = !data.password;

    console.log(`[CREATE USER] Admin ${admin.email} creating user: ${data.email} (role: ${data.role})`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(u => u.email === data.email);

    if (userExists) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: password,
      email_confirm: data.auto_verify, // Auto-verify if requested
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone || null,
      }
    });

    if (authError || !authUser.user) {
      console.error('[CREATE USER] Auth creation failed:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 500 }
      );
    }

    const userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name: data.full_name,
        phone: data.phone || null,
        role: data.role,
        account_status: 'active',
        email_verified: data.auto_verify,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('[CREATE USER] Profile creation failed:', profileError);

      // Rollback: Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // If role is mechanic, create mechanic record
    if (data.role === 'mechanic') {
      const { error: mechanicError } = await supabaseAdmin
        .from('mechanics')
        .insert({
          id: userId,
          user_id: userId,
          name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          account_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (mechanicError) {
        console.error('[CREATE USER] Mechanic record creation failed:', mechanicError);
        // Don't rollback - profile exists, just log the error
      }
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action_type: 'CREATE_USER',
      reason: null,
      metadata: {
        admin_email: admin.email,
        created_user_email: data.email,
        created_user_role: data.role,
        auto_verified: data.auto_verify,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[CREATE USER] ✅ User created successfully: ${data.email} (${userId})`);

    // Prepare response
    const response: any = {
      success: true,
      message: `User ${data.email} created successfully`,
      user: {
        id: userId,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        email_verified: data.auto_verify,
      },
    };

    // Include generated password in response if it was auto-generated
    if (generatedPassword) {
      response.generated_password = password;
      response.password_notice = 'Password was auto-generated. Share this securely with the user.';
    }

    return NextResponse.json(response, { status: 201 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[CREATE USER] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
