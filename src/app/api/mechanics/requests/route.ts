import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireMechanicAPI } from '@/lib/auth/guards';

export async function GET(req: NextRequest) {
  try {
    console.log('[MechanicsRequests] Starting request fetch...');

    // Use the correct authentication function that exists in your guards
    const authResult = await requireMechanicAPI(req);
    if (authResult.error) {
      console.log('[MechanicsRequests] Auth failed:', authResult.error);
      return authResult.error;
    }

    const mechanic = authResult.data;
    console.log('[MechanicsRequests] Authenticated mechanic:', {
      id: mechanic.id,
      serviceTier: mechanic.serviceTier,
      userId: mechanic.userId
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log(`[MechanicsRequests] Fetching ${status} requests for mechanic ${mechanic.id}`);

    // CRITICAL FIX: Use supabaseAdmin to bypass RLS since mechanics use custom auth
    const supabase = supabaseAdmin;

    // Get mechanic's full profile from mechanics table using mechanic ID (NOT user_id!)
    const { data: mechanicProfile, error: profileError } = await supabase
      .from('mechanics')
      .select('id, service_tier, workshop_id, user_id')
      .eq('id', mechanic.id)
      .single();

    if (profileError || !mechanicProfile) {
      console.error('[MechanicsRequests] Error fetching mechanic profile:', profileError);
      return NextResponse.json({
        error: 'Mechanic profile not found',
        details: profileError?.message
      }, { status: 404 });
    }

    console.log('[MechanicsRequests] Mechanic profile:', {
      service_tier: mechanicProfile.service_tier,
      workshop_id: mechanicProfile.workshop_id
    });

    // Build base query for session requests with ALL necessary joins
    let query = supabase
      .from('session_requests')
      .select(`
        *,
        intake:session_intakes(*),
        customer:customers!session_requests_customer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        files:session_request_files(*),
        vehicle:vehicles!session_requests_vehicle_id_fkey(
          id,
          make,
          model,
          year,
          vin,
          plate
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // CRITICAL FIX: For pending requests, only show requests this mechanic can accept
    if (status === 'pending') {
      // Exclude requests already accepted by this mechanic (if accepted_by field exists)
      // Note: accepted_by might be null for pending requests, so use .or() to handle this

      // Apply mechanic-specific filters based on their capabilities
      if (mechanicProfile.service_tier === 'virtual_only') {
        // Virtual-only mechanics only see virtual/diagnostic/chat requests
        console.log('[MechanicsRequests] Filtering for virtual-only mechanic');
        query = query.in('session_type', ['virtual', 'diagnostic', 'chat']);
      } else if (mechanicProfile.service_tier === 'workshop_affiliated' && mechanicProfile.workshop_id) {
        // Workshop mechanics see requests assigned to their workshop OR general requests
        console.log('[MechanicsRequests] Filtering for workshop mechanic:', mechanicProfile.workshop_id);
        query = query.or(`workshop_id.is.null,workshop_id.eq.${mechanicProfile.workshop_id}`);
      } else {
        // General mechanics (no workshop) see only non-workshop requests
        console.log('[MechanicsRequests] Filtering for independent mechanic (no workshop)');
        query = query.is('workshop_id', null);
      }
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('[MechanicsRequests] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    console.log(`[MechanicsRequests] Found ${requests?.length || 0} ${status} requests`);

    // Format the response to match what the frontend expects
    const formattedRequests = requests?.map(request => ({
      id: request.id,
      customer_name: request.customer ? 
        `${request.customer.first_name} ${request.customer.last_name}`.trim() : 
        request.customer_name || 'Customer',
      customer_email: request.customer?.email || request.customer_email,
      session_type: request.session_type,
      status: request.status,
      plan: request.plan_code,
      created_at: request.created_at,
      intake: request.intake?.[0] || null, // session_intakes is an array, take first
      files: request.files || [],
      urgent: request.urgent || false,
      workshop_id: request.workshop_id,
      vehicle: request.vehicle ? {
        make: request.vehicle.make,
        model: request.vehicle.model,
        year: request.vehicle.year,
        vin: request.vehicle.vin,
        plate: request.vehicle.plate
      } : null
    })) || [];

    return NextResponse.json({ 
      requests: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error) {
    console.error('[MechanicsRequests] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';