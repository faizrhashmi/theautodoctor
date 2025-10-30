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

    // Build base query for session requests - simplified (foreign keys don't exist)
    let query = supabase
      .from('session_requests')
      .select('*')
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
      } else if (mechanicProfile.workshop_id) {
        // Workshop-affiliated mechanics (workshop_affiliated, workshop_partner, licensed_mobile with workshop)
        // see requests assigned to their workshop OR general requests
        console.log('[MechanicsRequests] Filtering for workshop mechanic:', mechanicProfile.workshop_id);
        query = query.or(`workshop_id.is.null,workshop_id.eq.${mechanicProfile.workshop_id}`);
      } else {
        // Independent mechanics (no workshop) see only non-workshop requests
        console.log('[MechanicsRequests] Filtering for independent mechanic (no workshop)');
        query = query.is('workshop_id', null);
      }
    }

    const queryStartTime = Date.now();
    const { data: requests, error } = await query;
    const queryDuration = Date.now() - queryStartTime;

    if (error) {
      console.error('[MechanicsRequests] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    console.log(`[MechanicsRequests] Query completed in ${queryDuration}ms - Found ${requests?.length || 0} ${status} requests`);

    // Log request ages to detect delays
    if (requests && requests.length > 0) {
      requests.forEach(req => {
        const ageMs = Date.now() - new Date(req.created_at).getTime();
        const ageMinutes = Math.floor(ageMs / 60000);
        console.log(`[MechanicsRequests] Request ${req.id}: created ${ageMinutes}m ago (status: ${req.status})`);
      });
    }

    // Format the response to match what the frontend expects
    // Note: Removed joins due to missing foreign keys - using direct columns only
    const formattedRequests = requests?.map(request => ({
      id: request.id,
      customer_name: request.customer_name || 'Customer',
      customer_email: request.customer_email,
      session_type: request.session_type,
      status: request.status,
      plan: request.plan_code,
      created_at: request.created_at,
      intake: null, // No longer fetched - requires separate query
      files: [], // No longer fetched - requires separate query
      urgent: request.is_urgent || false,
      workshop_id: request.workshop_id,
      vehicle: null // No longer fetched - requires separate query
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