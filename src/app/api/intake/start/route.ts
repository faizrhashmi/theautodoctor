/**
 * Intake Start API - Session Creation Entry Point
 *
 * Handles intake form submission and initiates one of three session creation flows:
 *
 * 1. FREE/TRIAL FLOW (lines 205-256):
 *    - Creates session via sessionFactory
 *    - Redirects to waiver
 *    - Waiver route creates assignment after signature
 *    - Redirects to thank-you page
 *
 * 2. CREDIT-BASED FLOW (lines 114-203):
 *    - Creates session via sessionFactory
 *    - Deducts credits (atomic transaction with rollback)
 *    - Redirects to waiver
 *    - Redirects to thank-you page
 *
 * 3. PAID FLOW (lines 258-265):
 *    - NO session created yet
 *    - Redirects to waiver
 *    - Redirects to Stripe checkout
 *    - Session created after payment confirmation (webhook)
 *
 * All flows use the unified sessionFactory for consistent session creation.
 * See src/lib/sessionFactory.ts for implementation details.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database, Json } from '@/types/supabase';
import { trackInteraction } from '@/lib/crm';
import { PRICING, type PlanKey } from '@/config/pricing';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON');
  }

  const {
    plan = 'trial',
    name, email, phone, city,
    postalCode = null, // Postal code for location-based matching
    // NEW: Customer location fields for matching
    customer_country = null,
    customer_province = null,
    customer_city = null,
    customer_postal_code = null,
    vin = '', year = '', make = '', model = '',
    odometer = '', plate = '',
    concern,
    files = [],
    urgent = false,
    vehicle_id = null, // Vehicle ID from vehicles table (optional)
    use_credits = false, // Flag to use subscription credits
    is_specialist = false, // Flag for brand specialist
    // Phase 3: Favorites Priority Flow
    preferred_mechanic_id = null,
    routing_type = null,
    // Scheduling support
    scheduled_for = null, // ISO 8601 UTC timestamp for scheduled appointments
    mechanic_id = null, // Mechanic ID for scheduled sessions
  } = body || {};

  // Strict server-side validation mirrors the client
  if (!name || !email || !phone || !city) return bad('Missing required contact fields');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[0-9+()\-\s]{7,}$/i.test(phone);
  if (!emailOk) return bad('Invalid email');
  if (!phoneOk) return bad('Invalid phone');

  // For urgent sessions and quick/advice plans, vehicle info is optional - can be provided during session
  const vehicleOptionalPlans = ['quick', 'advice', 'free', 'trial'];
  const vehicleIsOptional = urgent || vehicleOptionalPlans.includes(plan);

  // Debug logging for vehicle validation
  console.log('[INTAKE API] Vehicle validation:', {
    plan,
    urgent,
    vehicleIsOptional,
    year: year || '(empty)',
    make: make || '(empty)',
    model: model || '(empty)',
    vin: vin || '(empty)',
    vehicle_id,
  })

  if (!vehicleIsOptional) {
    // Check for non-empty strings, not just truthy values
    const hasYMM = !!(year && String(year).trim() && make && String(make).trim() && model && String(model).trim());
    const hasValidVIN = vin && String(vin).trim().length === 17;

    console.log('[INTAKE API] Vehicle check:', { hasYMM, hasValidVIN })

    if (!hasValidVIN && !hasYMM) {
      return bad('Provide VIN (17) or full Year/Make/Model');
    }
  }

  // VIN validation removed - VIN is completely optional and not validated
  // User can provide any VIN format or leave it blank

  // Concern validation - shorter minimum for urgent sessions
  const minConcernLength = urgent ? 5 : 10;
  if (!concern || String(concern).trim().length < minConcernLength) {
    return bad(`Describe the issue (at least ${minConcernLength} characters)`);
  }

  // Persist intake
  let intakeId: string | null = null;
  if (supabaseAdmin) {
    const payload: any = {
      plan, name, email, phone, city,
      vin, year, make, model, odometer, plate, concern,
      files, // array of storage paths
      urgent, // flag for priority handling
      vehicle_id: vehicle_id || null, // Link to vehicles table
    };
    const { data, error } = await supabaseAdmin.from('intakes').insert(payload).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    intakeId = data.id;

    // Track intake submission in CRM
    if (user?.id && intakeId) {
      void trackInteraction({
        customerId: user.id,
        interactionType: 'intake_submitted',
        metadata: {
          intake_id: intakeId,
          plan,
          vehicle: vin ? `VIN: ${vin}` : `${year} ${make} ${model}`,
          has_files: files.length > 0,
          file_count: files.length,
        },
      });
    }
  } else {
    intakeId = `local-${Date.now()}`;
  }

  // Handle credit-based sessions
  if (use_credits && user?.id) {
    // 🚨 CREDIT-BASED SESSION FLOW: Use unified session factory
    if (!supabaseAdmin || !intakeId) {
      return bad('Server error: Admin client unavailable');
    }

    try {
      // Import session factory
      const { createSessionRecord, getSessionTypeFromPlan } = await import('@/lib/sessionFactory');

      // Determine session type from plan
      const sessionType = getSessionTypeFromPlan(plan);

      // Get credit cost from pricing table
      const { data: creditPricing, error: pricingError } = await supabaseAdmin
        .from('credit_pricing')
        .select('credit_cost')
        .eq('session_type', sessionType)
        .eq('is_specialist', is_specialist)
        .or('effective_until.is.null,effective_until.gt.' + new Date().toISOString())
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (pricingError || !creditPricing) {
        return bad('Unable to determine credit cost for this session');
      }

      const creditCost = creditPricing.credit_cost;

      // Create session using unified factory
      const result = await createSessionRecord({
        customerId: user.id,
        customerEmail: user.email,
        type: sessionType,
        plan,
        intakeId,
        paymentMethod: 'credits',
        creditCost,
        urgent,
        isSpecialist: is_specialist,
        preferredMechanicId: preferred_mechanic_id || mechanic_id, // Use mechanic_id for scheduled sessions
        routingType: routing_type as any,
        // NEW: Pass customer location for matching
        customerCountry: customer_country,
        customerProvince: customer_province,
        customerCity: customer_city,
        customerPostalCode: customer_postal_code,
        // Scheduling support
        scheduledFor: scheduled_for ? new Date(scheduled_for) : null,
      });

      const sessionId = result.sessionId;

      // Deduct credits using database function
      const { error: deductError } = await supabaseAdmin.rpc('deduct_session_credits', {
        p_customer_id: user.id,
        p_session_id: sessionId,
        p_session_type: sessionType,
        p_is_specialist: is_specialist,
        p_credit_cost: creditCost,
      });

      if (deductError) {
        // Rollback: Delete the session if credit deduction failed
        await supabaseAdmin.from('sessions').delete().eq('id', sessionId);

        return NextResponse.json({
          error: deductError.message.includes('Insufficient credits')
            ? 'Insufficient credits. Please add more credits or choose a pay-as-you-go option.'
            : 'Failed to deduct credits. Please try again.',
        }, { status: 400 });
      }

      console.log(`[INTAKE] ✓ Credit-based session created via factory: ${sessionId}, deducted ${creditCost} credits`);

      // Add credits_used parameter to redirect URL
      const redirectUrl = `${result.redirectUrl}&credits_used=true`;

      return NextResponse.json({ redirect: redirectUrl });

    } catch (error: any) {
      // Handle active session conflict (409)
      if (error.code === 'ACTIVE_SESSION_EXISTS') {
        return NextResponse.json({
          error: 'You already have an active or pending session. Please complete or cancel your existing session before starting a new one.',
          activeSessionId: error.activeSession.id,
          activeSessionType: error.activeSession.type,
          activeSessionStatus: error.activeSession.status,
        }, { status: 409 });
      }

      // Other errors
      console.error('[INTAKE] Credit-based session creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
    // 🚨 FREE SESSION FLOW: Use unified session factory
    if (!user?.id || !intakeId) {
      return bad('User authentication or intake ID required');
    }

    try {
      // Import session factory (dynamic to avoid circular deps)
      const { createSessionRecord, getSessionTypeFromPlan } = await import('@/lib/sessionFactory');

      // Determine session type from plan
      const sessionType = getSessionTypeFromPlan(plan);

      // Generate free session key (for tracking)
      const freeSessionKey = `free_${intakeId}_${randomUUID()}`;

      // Create session using unified factory
      const result = await createSessionRecord({
        customerId: user.id,
        customerEmail: user.email,
        type: sessionType,
        plan,
        intakeId,
        stripeSessionId: freeSessionKey,
        paymentMethod: 'free',
        urgent,
        isSpecialist: is_specialist,
        preferredMechanicId: preferred_mechanic_id || mechanic_id, // Use mechanic_id for scheduled sessions
        routingType: routing_type as any,
        // NEW: Pass customer location for matching
        customerCountry: customer_country,
        customerProvince: customer_province,
        customerCity: customer_city,
        customerPostalCode: customer_postal_code,
        // Scheduling support
        scheduledFor: scheduled_for ? new Date(scheduled_for) : null,
      });

      console.log(`[INTAKE] ✓ Free session created via factory: ${result.sessionId}`);

      // Factory returns the redirect URL, use it directly
      return NextResponse.json({ redirect: result.redirectUrl });

    } catch (error: any) {
      // Handle active session conflict (409)
      if (error.code === 'ACTIVE_SESSION_EXISTS') {
        return NextResponse.json({
          error: 'You already have an active or pending session. Please complete or cancel your existing session before starting a new one.',
          activeSessionId: error.activeSession.id,
          activeSessionType: error.activeSession.type,
          activeSessionStatus: error.activeSession.status,
        }, { status: 409 });
      }

      // Other errors
      console.error('[INTAKE] Free session creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Paid plans also redirect to waiver first, then waiver will redirect to checkout
  const waiverUrl = new URL('/intake/waiver', req.nextUrl.origin);
  waiverUrl.searchParams.set('plan', plan);
  if (intakeId) waiverUrl.searchParams.set('intake_id', intakeId);

  return NextResponse.json({
    redirect: `${waiverUrl.pathname}${waiverUrl.search}`,
  });
}
