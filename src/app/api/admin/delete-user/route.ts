import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`[DELETE USER] Deleting user: ${email}`);

    // Check if user exists in mechanics table
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (mechanic) {
      console.log(`[DELETE USER] Found mechanic: ${mechanic.id}`);

      // Delete mechanic sessions first
      await supabase
        .from('mechanic_sessions')
        .delete()
        .eq('mechanic_id', mechanic.id);

      // Delete mechanic record
      const { error: mechError } = await supabase
        .from('mechanics')
        .delete()
        .eq('id', mechanic.id);

      if (mechError) {
        console.error(`[DELETE USER] Failed to delete mechanic record:`, mechError);
      } else {
        console.log(`[DELETE USER] Deleted mechanic record`);
      }
    }

    // Check if user exists in organizations table
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (organization) {
      console.log(`[DELETE USER] Found organization: ${organization.id}`);

      // Delete organization members
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organization.id);

      // Delete organization record
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (orgError) {
        console.error(`[DELETE USER] Failed to delete organization record:`, orgError);
      } else {
        console.log(`[DELETE USER] Deleted organization record`);
      }
    }

    // Delete auth user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`[DELETE USER] Failed to list users:`, listError);
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
    }

    const user = users.users.find(u => u.email === email);

    if (user) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`[DELETE USER] Failed to delete auth user:`, deleteError);
        return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
      }

      console.log(`[DELETE USER] Deleted auth user: ${user.id}`);
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted successfully`,
      deletedMechanic: !!mechanic,
      deletedOrganization: !!organization,
      deletedAuthUser: !!user
    });

  } catch (error: any) {
    console.error('[DELETE USER] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
