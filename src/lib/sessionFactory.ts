/**
 * UNIFIED SESSION FACTORY
 *
 * Single source of truth for session creation across all flows:
 * - Free sessions (trial, free)
 * - Credit-based sessions
 * - Paid sessions (via Stripe)
 *
 * This ensures consistent session creation, participant tracking,
 * assignment queueing, and event logging regardless of payment method.
 *
 * CRITICAL DESIGN NOTE:
 * FREE sessions create the session record immediately but DEFER assignment
 * creation until AFTER waiver is signed (in waiver/submit route). This prevents
 * notifying mechanics before the customer has accepted liability terms.
 *
 * PAID/CREDIT sessions create both session and assignment immediately since
 * payment/credit deduction implies commitment.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Json } from '@/types/supabase'

export interface CreateSessionParams {
  // Customer info
  customerId: string
  customerEmail?: string

  // Session type and plan
  type: 'chat' | 'video' | 'diagnostic'
  plan: string

  // Intake data
  intakeId: string

  // Payment info
  stripeSessionId?: string | null
  paymentMethod: 'free' | 'stripe' | 'credits'
  amountPaid?: number | null
  creditCost?: number | null

  // Additional metadata
  urgent?: boolean
  isSpecialist?: boolean
  preferredMechanicId?: string | null
  routingType?: 'broadcast' | 'workshop_only' | 'hybrid' | 'priority_broadcast'
  workshopId?: string | null
  slotId?: string | null

  // NEW: Customer location for matching
  customerCountry?: string | null
  customerProvince?: string | null
  customerCity?: string | null
  customerPostalCode?: string | null

  // NEW: Scheduling fields
  scheduledFor?: Date | null              // Future appointment time (ISO 8601 UTC)
  reservationId?: string | null           // If slot was pre-reserved during checkout

  // Optional: Skip active session check (for special cases)
  skipActiveCheck?: boolean
}

export interface CreateSessionResult {
  sessionId: string
  sessionType: 'chat' | 'video' | 'diagnostic'
  status: 'pending'
  redirectUrl: string
}

export interface ActiveSessionError extends Error {
  code: 'ACTIVE_SESSION_EXISTS'
  activeSession: {
    id: string
    type: string
    status: string
  }
}

/**
 * Check if customer has an active session
 * Returns the active session if found, null otherwise
 */
async function checkActiveSession(customerId: string) {
  const { data: activeSessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, type, status, plan, created_at')
    .eq('customer_user_id', customerId)
    .in('status', ['pending', 'waiting', 'live'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[sessionFactory] Error checking active sessions:', error)
    return null
  }

  return activeSessions && activeSessions.length > 0 ? activeSessions[0] : null
}

/**
 * UNIFIED SESSION CREATION FUNCTION
 *
 * Creates a session record along with all required related records:
 * - session record in sessions table
 * - participant record (customer) in session_participants
 * - assignment record (queued) in session_assignments
 * - creation event in session_events
 *
 * @throws {ActiveSessionError} if customer already has an active session
 * @throws {Error} if session creation fails
 */
export async function createSessionRecord(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const {
    customerId,
    customerEmail,
    type,
    plan,
    intakeId,
    stripeSessionId = null,
    paymentMethod,
    amountPaid = null,
    creditCost = null,
    urgent = false,
    isSpecialist = false,
    preferredMechanicId = null,
    routingType = 'broadcast',
    workshopId = null,
    slotId = null,
    customerCountry = null,
    customerProvince = null,
    customerCity = null,
    customerPostalCode = null,
    scheduledFor = null,
    reservationId = null,
    skipActiveCheck = false
  } = params

  // Step 1: Check for active sessions (unless explicitly skipped)
  if (!skipActiveCheck) {
    const activeSession = await checkActiveSession(customerId)
    if (activeSession) {
      const error = new Error('You already have an active session') as ActiveSessionError
      error.code = 'ACTIVE_SESSION_EXISTS'
      error.activeSession = {
        id: activeSession.id,
        type: activeSession.type,
        status: activeSession.status
      }
      throw error
    }
  }

  // Step 2: Build session metadata
  const metadata: Record<string, Json> = {
    payment_method: paymentMethod,
    urgent,
    source: 'intake'
  }

  if (amountPaid !== null) metadata.amount_paid = amountPaid
  if (creditCost !== null) metadata.credit_cost = creditCost
  if (isSpecialist) metadata.is_specialist = isSpecialist
  if (preferredMechanicId) metadata.preferred_mechanic_id = preferredMechanicId
  if (routingType) metadata.routing_type = routingType
  if (workshopId) metadata.workshop_id = workshopId
  if (slotId) metadata.slot_id = slotId

  // NEW: Store customer location for matching
  if (customerCountry) metadata.customer_country = customerCountry
  if (customerProvince) metadata.customer_province = customerProvince
  if (customerCity) metadata.customer_city = customerCity
  if (customerPostalCode) metadata.customer_postal_code = customerPostalCode

  // NEW: Store scheduling metadata
  if (scheduledFor) {
    metadata.scheduled_for_original = scheduledFor.toISOString()
    metadata.is_scheduled = true
  }
  if (reservationId) metadata.reservation_id = reservationId

  // Step 3: Create session record
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      customer_user_id: customerId,
      type,
      status: scheduledFor ? 'scheduled' : 'pending', // 'scheduled' for future appointments
      plan,
      scheduled_for: scheduledFor ? scheduledFor.toISOString() : null, // ⭐ POPULATE THIS FIELD
      intake_id: intakeId,
      stripe_session_id: stripeSessionId,
      ended_at: null, // Explicitly set to null to ensure session is open
      metadata
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('[sessionFactory] Failed to create session:', sessionError)
    throw new Error(`Failed to create session: ${sessionError?.message || 'Unknown error'}`)
  }

  const sessionId = session.id
  console.log(`[sessionFactory] Created session ${sessionId} for customer ${customerId}`)

  // Step 4: Create session participant (customer)
  const { error: participantError } = await supabaseAdmin
    .from('session_participants')
    .upsert({
      session_id: sessionId,
      user_id: customerId,
      role: 'customer'
    }, {
      onConflict: 'session_id,user_id'
    })

  if (participantError) {
    console.error('[sessionFactory] Failed to create participant:', participantError)
    // Don't fail the whole flow - participant can be created later
  } else {
    console.log(`[sessionFactory] Created participant for session ${sessionId}`)
  }

  // Step 5: SMART MATCHING - Run matching algorithm for ALL session types
  // Changed: Always create assignments (including free sessions) - matching happens at same point
  console.log(`[sessionFactory] Running smart matching for session ${sessionId}`)

  let matches: any[] = []
  const targetedAssignments: any[] = []

  try {
    const { findMatchingMechanics, extractKeywordsFromDescription } = await import('./mechanicMatching')

    // Fetch intake data for concern and vehicle info
    const { data: intake } = await supabaseAdmin
      .from('intakes')
      .select('concern, year, make, model, vin')
      .eq('id', intakeId)
      .single()

    if (!intake) {
      throw new Error('Intake not found')
    }

    // Extract keywords from concern description
    const extractedKeywords = extractKeywordsFromDescription(intake.concern || '')

    // Build matching criteria
    const matchingCriteria = {
      requestType: isSpecialist ? ('brand_specialist' as const) : ('general' as const),
      requestedBrand: metadata.requested_brand as string | undefined,
      extractedKeywords,
      customerCountry: customerCountry || undefined,
      customerCity: customerCity || undefined,
      customerPostalCode: customerPostalCode || undefined,
      preferLocalMechanic: true,
      urgency: urgent ? ('immediate' as const) : ('scheduled' as const),
    }

    console.log(`[sessionFactory] Matching criteria:`, {
      requestType: matchingCriteria.requestType,
      brand: matchingCriteria.requestedBrand,
      keywordCount: extractedKeywords.length,
      location: matchingCriteria.customerCity,
      postalCode: matchingCriteria.customerPostalCode,
    })

    // Find top matching mechanics
    matches = await findMatchingMechanics(matchingCriteria)

    console.log(`[sessionFactory] Found ${matches.length} matching mechanics`)
    if (matches.length > 0) {
      console.log(`[sessionFactory] Top 3 matches:`, matches.slice(0, 3).map((m: any) => ({
        name: m.mechanicName,
        score: m.matchScore,
        availability: m.availability,
        reasons: m.matchReasons
      })))
    }

    // Store match results in metadata
    metadata.matching_results = {
      total_matches: matches.length,
      top_scores: matches.slice(0, 3).map((m: any) => ({
        mechanic_id: m.mechanicId,
        score: m.matchScore,
        reasons: m.matchReasons
      })),
      extracted_keywords: extractedKeywords
    }

    // Create TARGETED assignments for top 3 matches
    if (matches.length > 0) {
      console.log(`[sessionFactory] Creating targeted assignments for top 3 mechanics`)

      const topMatches = matches.slice(0, 3)

      for (const match of topMatches) {
        try {
          const { data: assignment, error: assignError } = await supabaseAdmin
            .from('session_assignments')
            .insert({
              session_id: sessionId,
              mechanic_id: match.mechanicId,
              status: 'offered',
              offered_at: new Date().toISOString(),
              metadata: {
                match_type: 'targeted',
                match_score: match.matchScore,
                match_reasons: match.matchReasons,
                is_brand_specialist: match.isBrandSpecialist,
                is_local_match: match.isLocalMatch,
              }
            })
            .select('id')
            .single()

          if (!assignError && assignment) {
            targetedAssignments.push(assignment)
            console.log(`[sessionFactory] ✓ Created targeted assignment for ${match.mechanicName} (score: ${match.matchScore})`)
          }
        } catch (err) {
          console.error(`[sessionFactory] Failed to create targeted assignment:`, err)
        }
      }
    }

  } catch (matchError) {
    console.error('[sessionFactory] Matching failed, continuing with broadcast only:', matchError)
    // Don't fail session creation if matching fails
  }

  // Create BROADCAST assignment as fallback (always, even if targeted assignments exist)
  console.log(`[sessionFactory] Creating broadcast assignment for remaining mechanics`)

  const { data: broadcastAssignment, error: broadcastError } = await supabaseAdmin
    .from('session_assignments')
    .insert({
      session_id: sessionId,
      mechanic_id: null, // null = broadcast to all
      status: 'queued',
      offered_at: new Date().toISOString(),
      metadata: {
        match_type: 'broadcast',
        reason: matches.length > 0 ? 'fallback_if_no_targeted_accepts' : 'no_matches_found',
      }
    })
    .select('id')
    .single()

  if (broadcastError) {
    console.error('[sessionFactory] Failed to create broadcast assignment:', broadcastError)
  } else {
    console.log(`[sessionFactory] ✓ Created broadcast assignment`)
  }

  // Assignment summary
  const totalAssignments = targetedAssignments.length + (broadcastAssignment ? 1 : 0)
  console.log(`[sessionFactory] Created ${totalAssignments} total assignments (${targetedAssignments.length} targeted, ${broadcastAssignment ? 1 : 0} broadcast)`)

  // Step 5.5: Broadcast new assignments to mechanics in real-time
  // Broadcast TARGETED assignments to specific mechanics (high priority)
  // General broadcast happens via mechanic queue polling
  const shouldBroadcast = true // Always broadcast (changed from paymentMethod !== 'free')

  if (shouldBroadcast && targetedAssignments.length > 0) {
    try {
      const { broadcastSessionAssignment } = await import('./realtimeChannels')

      // Fetch intake data for broadcast payload
      const { data: intake } = await supabaseAdmin
        .from('intakes')
        .select('name, year, make, model, vin, concern')
        .eq('id', intakeId)
        .single()

      const vehicleSummary = intake?.vin
        ? `VIN: ${intake.vin}`
        : `${intake?.year || ''} ${intake?.make || ''} ${intake?.model || ''}`.trim()

      // Broadcast to each TARGETED mechanic individually (high priority notifications)
      for (let i = 0; i < targetedAssignments.length; i++) {
        const assignment = targetedAssignments[i]
        const match = matches[i]

        await broadcastSessionAssignment('new_targeted_assignment', {
          assignmentId: assignment.id,
          sessionId: sessionId,
          mechanicId: match.mechanicId,
          customerName: intake?.name || 'Customer',
          vehicleSummary: vehicleSummary || 'Vehicle',
          vehicle: vehicleSummary || 'Vehicle',
          concern: intake?.concern || '',
          urgent: urgent || false,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          priority: 'high',
        })
      }

      console.log(`[sessionFactory] ✅ Broadcasted ${targetedAssignments.length} targeted assignments for session ${sessionId}`)
    } catch (broadcastError) {
      console.error('[sessionFactory] Failed to broadcast assignments:', broadcastError)
      // Don't fail session creation if broadcast fails
    }
  } else if (shouldBroadcast && targetedAssignments.length === 0) {
    console.log(`[sessionFactory] No targeted assignments to broadcast - mechanics will see via queue polling`)
  }

  // Step 6: Log session creation event
  const eventMetadata: Record<string, Json> = {
    type,
    plan,
    payment_method: paymentMethod,
    urgent,
    source: 'intake'
  }

  if (amountPaid !== null) eventMetadata.amount_paid = amountPaid
  if (creditCost !== null) eventMetadata.credit_cost = creditCost

  const { error: eventError } = await supabaseAdmin
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'created',
      user_id: customerId,
      metadata: eventMetadata
    })

  if (eventError) {
    console.error('[sessionFactory] Failed to log event:', eventError)
    // Don't fail the whole flow - event logging is non-critical
  } else {
    console.log(`[sessionFactory] Logged creation event for session ${sessionId}`)
  }

  // Step 7: Determine redirect URL
  // All sessions should go through waiver flow
  const redirectUrl = `/intake/waiver?session=${sessionId}&plan=${plan}&intake_id=${intakeId}`

  console.log(`[sessionFactory] ✓ Session ${sessionId} created successfully`)

  return {
    sessionId,
    sessionType: type,
    status: 'pending',
    redirectUrl
  }
}

/**
 * Helper function to determine session type from plan
 * Maps plan slugs to session types (chat, video, diagnostic)
 */
export function getSessionTypeFromPlan(plan: string): 'chat' | 'video' | 'diagnostic' {
  // Chat plans
  if (plan.includes('chat') || plan === 'quick' || plan === 'free' || plan === 'trial' || plan === 'trial-free') {
    return 'chat'
  }

  // Diagnostic plans
  if (plan.includes('diagnostic')) {
    return 'diagnostic'
  }

  // Default to video for standard/premium plans
  return 'video'
}
