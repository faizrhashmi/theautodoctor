import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 });
    }

    console.log('[MECHANIC LOGIN] Validating email:', email);

    // Create service client for validation (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // SERVER-SIDE VALIDATION: Check if email is a mechanic
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('email, user_id, application_status')
      .eq('email', email)
      .maybeSingle();

    if (!mechanic) {
      console.log('[MECHANIC LOGIN] Email is not registered as a mechanic');
      return NextResponse.json({
        error: 'This is not a mechanic account. Please use the customer login or sign up as a mechanic.'
      }, { status: 403 });
    }

    if (!mechanic.user_id) {
      console.log('[MECHANIC LOGIN] Mechanic account not linked to auth.users');
      return NextResponse.json({
        error: 'Your mechanic account needs to be migrated. Please contact support.'
      }, { status: 403 });
    }

    console.log('[MECHANIC LOGIN] Email validated as mechanic, authenticating...');

    // Authenticate with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('[MECHANIC LOGIN] Auth error:', authError);

      if (authError.message.includes('Invalid login credentials')) {
        return NextResponse.json({
          error: 'Invalid email or password. Please try again.'
        }, { status: 401 });
      } else if (authError.message.includes('Email not confirmed')) {
        return NextResponse.json({
          error: 'Please confirm your email before logging in.'
        }, { status: 401 });
      } else {
        return NextResponse.json({
          error: authError.message
        }, { status: 401 });
      }
    }

    if (!authData.user) {
      return NextResponse.json({
        error: 'Authentication failed'
      }, { status: 401 });
    }

    // Check email confirmation
    if (!authData.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json({
        error: 'Please confirm your email before logging in.'
      }, { status: 401 });
    }

    // Verify the authenticated user matches the mechanic user_id
    if (authData.user.id !== mechanic.user_id) {
      await supabase.auth.signOut();
      console.error('[MECHANIC LOGIN] User ID mismatch');
      return NextResponse.json({
        error: 'Account verification failed. Please contact support.'
      }, { status: 403 });
    }

    const session = authData.session;
    if (!session || !session.access_token) {
      return NextResponse.json({
        error: 'Failed to create session'
      }, { status: 500 });
    }

    console.log('[MECHANIC LOGIN] Login successful for:', email);

    // Return tokens for client to set
    return NextResponse.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

  } catch (error: any) {
    console.error('[MECHANIC LOGIN] Error:', error);
    return NextResponse.json({
      error: error.message || 'Login failed'
    }, { status: 500 });
  }
}
