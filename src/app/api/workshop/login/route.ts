import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

    // Create a client for auth operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    // Return session tokens for client to set
    const res = NextResponse.json({
      ok: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: membership.role,
        organizationId: membership.organization_id,
      },
    });

    // Set session cookies
    if (authData.session) {
      res.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: authData.session.expires_in || 3600,
      });

      res.cookies.set('sb-refresh-token', authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (error: any) {
    console.error('[WORKSHOP LOGIN] Error:', error);
    return bad(error.message || 'Login failed', 500);
  }
}
