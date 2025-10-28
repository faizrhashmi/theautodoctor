import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || 'mech1@test.com';

    // Get mechanic record
    const { data: mechanic, error } = await supabase
      .from('mechanics')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 });
    }

    // Test password verification
    const testPassword = '12345678';
    const passwordMatches = verifyPassword(testPassword, mechanic.password_hash);

    return NextResponse.json({
      email: mechanic.email,
      name: mechanic.name,
      id: mechanic.id,
      account_type: mechanic.account_type,
      application_status: mechanic.application_status,
      is_available: mechanic.is_available,
      can_accept_sessions: mechanic.can_accept_sessions,
      participation_mode: mechanic.participation_mode,
      password_hash_exists: !!mechanic.password_hash,
      password_hash_length: mechanic.password_hash?.length || 0,
      password_hash_format: mechanic.password_hash?.includes(':') ? 'scrypt' : 'unknown',
      test_password_matches: passwordMatches,
      created_at: mechanic.created_at,
      approved_at: mechanic.approved_at
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
