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

  // Step 3: Create session record
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      customer_user_id: customerId,
      type,
      status: 'pending',
      plan,
      intake_id: intakeId,
      stripe_session_id: stripeSessionId,
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

  // Step 5: Create session assignment (queued for mechanics)
  const assignmentMetadata: Record<string, Json> = {}
  if (preferredMechanicId) {
    assignmentMetadata.preferred_mechanic_id = preferredMechanicId
  }
  if (workshopId) {
    assignmentMetadata.workshop_id = workshopId
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('session_assignments')
    .insert({
      session_id: sessionId,
      status: 'queued',
      offered_at: new Date().toISOString(),
      ...(Object.keys(assignmentMetadata).length > 0 && { metadata: assignmentMetadata })
    })
    .select('id')
    .single()

  if (assignmentError) {
    console.error('[sessionFactory] Failed to create assignment:', assignmentError)
    // Don't fail the whole flow - assignment can be created later
  } else {
    console.log(`[sessionFactory] Created assignment for session ${sessionId}`)

    // Step 5.5: Broadcast new assignment to mechanics in real-time
    // IMPORTANT: Skip broadcast for FREE sessions - they broadcast after waiver acceptance
    const shouldBroadcast = paymentMethod !== 'free'

    if (shouldBroadcast) {
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

        await broadcastSessionAssignment('new_assignment', {
          assignmentId: assignment?.id,
          sessionId: sessionId,
          requestId: sessionId, // For backward compatibility
          customerName: intake?.name || 'Customer',
          vehicleSummary: vehicleSummary || 'Vehicle',
          vehicle: vehicleSummary || 'Vehicle',
          concern: intake?.concern || '',
          urgent: urgent || false,
        })

        console.log(`[sessionFactory] ✅ Broadcasted new assignment for session ${sessionId}`)
      } catch (broadcastError) {
        console.error('[sessionFactory] Failed to broadcast assignment:', broadcastError)
        // Don't fail session creation if broadcast fails - it's a nice-to-have
      }
    } else {
      console.log(`[sessionFactory] ⏭️  Skipping broadcast for free session - will broadcast after waiver`)
    }
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
