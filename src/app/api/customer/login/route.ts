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

    console.log('[CUSTOMER LOGIN] Validating email:', email);

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
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (mechanic) {
      console.log('[CUSTOMER LOGIN] Email belongs to mechanic account');
      return NextResponse.json({
        error: 'This is a mechanic account. Please use the "For Mechanics" login.'
      }, { status: 403 });
    }

    // SERVER-SIDE VALIDATION: Check if email is a workshop
    const { data: workshop } = await supabase
      .from('organizations')
      .select('email, organization_type')
      .eq('email', email)
      .maybeSingle();

    if (workshop && workshop.organization_type === 'workshop') {
      console.log('[CUSTOMER LOGIN] Email belongs to workshop account');
      return NextResponse.json({
        error: 'This is a workshop account. Please use the "For Workshops" login.'
      }, { status: 403 });
    }

    console.log('[CUSTOMER LOGIN] Email validated as customer, authenticating...');

    // Authenticate with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('[CUSTOMER LOGIN] Auth error:', authError);

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

    const session = authData.session;
    if (!session || !session.access_token) {
      return NextResponse.json({
        error: 'Failed to create session'
      }, { status: 500 });
    }

    console.log('[CUSTOMER LOGIN] Login successful for:', email);

    // Return tokens for client to set
    return NextResponse.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

  } catch (error: any) {
    console.error('[CUSTOMER LOGIN] Error:', error);
    return NextResponse.json({
      error: error.message || 'Login failed'
    }, { status: 500 });
  }
}
