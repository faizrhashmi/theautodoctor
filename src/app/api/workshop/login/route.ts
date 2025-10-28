import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  try {
    const { email, password } = await req.json();

    console.log('[WORKSHOP LOGIN] Attempt for email:', email);

    if (!email || !password) {
      return bad('Email and password are required');
    }

    // Prepare response
    const response = NextResponse.json({ ok: true });

    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === 'production';

    // Create Supabase client with cookie handling (same pattern as admin login)
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: isProduction,
            httpOnly: true,
            path: '/',
          };
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: isProduction,
            httpOnly: true,
            path: '/',
            maxAge: 0,
          };
          response.cookies.set({ name, value: '', ...cookieOptions });
        },
      },
    });

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.log('[WORKSHOP LOGIN] Auth failed:', authError?.message);
      return bad('Invalid credentials', 401);
    }

    console.log('[WORKSHOP LOGIN] Auth successful for user:', authData.user.id);

    // Verify user is a workshop admin by checking organization membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        organization_id,
        organizations (
          id,
          organization_type,
          status
        )
      `)
      .eq('user_id', authData.user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      console.log('[WORKSHOP LOGIN] No active organization membership found');
      // Sign out the user since they're not a workshop member
      await supabase.auth.signOut();
      return bad('You do not have access to a workshop account', 403);
    }

    // Verify it's a workshop organization (not corporate)
    const org = membership.organizations as any;
    if (!org || org.organization_type !== 'workshop') {
      console.log('[WORKSHOP LOGIN] Not a workshop organization');
      await supabase.auth.signOut();
      return bad('This account is not associated with a workshop', 403);
    }

    // Check if organization is active
    if (org.status !== 'active' && org.status !== 'pending') {
      console.log('[WORKSHOP LOGIN] Organization not active:', org.status);
      await supabase.auth.signOut();
      return bad('Your workshop account is ' + org.status, 403);
    }

    console.log('[WORKSHOP LOGIN] Success! Workshop member:', membership.role);

    // DEBUG: Log cookies being set
    const cookieHeaders = response.headers.getSetCookie();
    console.log('[WORKSHOP LOGIN] 🍪 Cookies being set:', cookieHeaders.length);
    cookieHeaders.forEach((cookie, i) => {
      const cookieName = cookie.split('=')[0];
      console.log(`   ${i + 1}. ${cookieName}`);
    });

    // Return the response with cookies
    return response;
  } catch (error: any) {
    console.error('[WORKSHOP LOGIN] Error:', error);
    return bad(error.message || 'Login failed', 500);
  }
}
