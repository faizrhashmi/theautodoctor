import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || 'workshop1@test.com';

    // Test 1: Check with anon key (browser client)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: workshopAnon, error: anonError } = await anonClient
      .from('organizations')
      .select('email, organization_type')
      .eq('email', email)
      .maybeSingle();

    // Test 2: Check with service key (server)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: workshopService, error: serviceError } = await serviceClient
      .from('organizations')
      .select('email, organization_type')
      .eq('email', email)
      .maybeSingle();

    // Test 3: Check mechanics table
    const { data: mechanic, error: mechError } = await anonClient
      .from('mechanics')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    return NextResponse.json({
      email,
      anonClientTest: {
        canReadOrganizations: !anonError,
        foundWorkshop: !!workshopAnon,
        data: workshopAnon,
        error: anonError?.message
      },
      serviceClientTest: {
        canReadOrganizations: !serviceError,
        foundWorkshop: !!workshopService,
        data: workshopService,
        error: serviceError?.message
      },
      mechanicCheck: {
        foundMechanic: !!mechanic,
        data: mechanic,
        error: mechError?.message
      },
      conclusion: {
        rlsBlockingAnonClient: anonError && !serviceError,
        validationWillFail: !workshopAnon && !!workshopService
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
