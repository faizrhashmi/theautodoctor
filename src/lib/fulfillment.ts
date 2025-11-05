import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { type PlanKey } from '@/config/pricing'
import type { Database, Json } from '@/types/supabase'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'
import { trackInteraction } from '@/lib/crm'
import {
  validateSessionRequestReferences,
  validateSessionParticipantReferences,
  ForeignKeyValidationError
} from '@/lib/validation/foreignKeyValidator'
import { isFeatureEnabled } from '@/lib/flags'

type SessionType = 'chat' | 'video' | 'diagnostic'
type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type SessionUpdate = Database['public']['Tables']['sessions']['Update']
type ParticipantInsert = Database['public']['Tables']['session_participants']['Insert']

const PLAN_TO_TYPE: Record<PlanKey, SessionType> = {
  chat10: 'chat',
  video15: 'video',
  diagnostic: 'diagnostic',
}

const ROUTE_PREFIX: Record<SessionType, string> = {
  chat: '/chat',
  video: '/video',
  diagnostic: '/diagnostic',
}

type FulfillCheckoutOptions = {
  stripeSessionId: string
  intakeId?: string | null
  supabaseUserId?: string | null
  customerEmail?: string | null
  amountTotal?: number | null
  currency?: string | null
  slotId?: string | null
  workshopId?: string | null
  routingType?: 'workshop_only' | 'broadcast' | 'hybrid'
}

export type FulfillCheckoutResult = {
  sessionId: string
  route: string
  type: SessionType
}

function normalizeJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(normalizeJson)
  }
  if (value && typeof value === 'object') {
    const output: Record<string, Json> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      output[key] = normalizeJson(inner)
    }
    return output
  }
  return null
}

function coerceMetadata(input: unknown): Record<string, Json> {
  const normalized = normalizeJson(input)
  if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
    return normalized as Record<string, Json>
  }
  return {}
}

function buildMetadataPatch(
  existing: unknown,
  updates: Record<string, unknown | null | undefined>,
): Record<string, Json> {
  const base = coerceMetadata(existing)
  const patch: Record<string, Json> = { ...base }
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      patch[key] = normalizeJson(value)
    }
  }
  return patch
}

export async function fulfillCheckout(
  plan: PlanKey,
  {
    stripeSessionId,
    intakeId,
    supabaseUserId,
    customerEmail,
    amountTotal,
    currency,
    slotId,
    workshopId,
    routingType = 'broadcast',
  }: FulfillCheckoutOptions,
): Promise<FulfillCheckoutResult> {
  const sessionType = PLAN_TO_TYPE[plan]
  if (!sessionType) {
    throw new Error(`[fulfillment] Unsupported plan key "${plan}"`)
  }

  // CRITICAL: Check for existing active/pending sessions - Only ONE session allowed at a time!
  // Uses centralized cleanup utility for consistency and robustness
  if (supabaseUserId) {
    const { checkCustomerSessionStatus } = await import('./sessionCleanup')
    const sessionStatus = await checkCustomerSessionStatus(supabaseUserId)

    if (sessionStatus.blocked && sessionStatus.session) {
      throw new Error(
        `Customer already has an active session (ID: ${sessionStatus.session.id}, Status: ${sessionStatus.session.status}). Please complete or cancel it before creating a new one.`
      )
    }
  }

  const existing = await supabaseAdmin
    .from('sessions')
    .select('id, type, plan, customer_user_id, intake_id, metadata')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (existing.error) {
    throw new Error(`[fulfillment] Failed to lookup session: ${existing.error.message}`)
  }

  const metadataPatch = buildMetadataPatch(existing.data?.metadata ?? null, {
    intake_id: intakeId ?? null,
    customer_email: customerEmail ?? null,
    amount_total: amountTotal ?? null,
    currency: currency ?? null,
    slot_id: slotId ?? null,
  })

  if (existing.data) {
    const updates: SessionUpdate = {}
    if (!existing.data.plan) {
      updates.plan = plan
    }
    if (!existing.data.customer_user_id && supabaseUserId) {
      updates.customer_user_id = supabaseUserId
    }
    if (!existing.data.intake_id && intakeId) {
      updates.intake_id = intakeId
    }
    if (Object.keys(metadataPatch).length > 0) {
      updates.metadata = metadataPatch as Json
    }

    if (Object.keys(updates).length > 0) {
      const updateResult = await supabaseAdmin
        .from('sessions')
        .update(updates)
        .eq('id', existing.data.id)

      if (updateResult.error) {
        throw new Error(`[fulfillment] Failed to update session: ${updateResult.error.message}`)
      }
    }

    await upsertParticipant(existing.data.id, supabaseUserId)

    // ✅ Session already exists from previous webhook/factory call
    // The unified factory already created session_assignments when the session was first created
    // No need to create session_request (deprecated)

    return {
      sessionId: existing.data.id,
      route: `${ROUTE_PREFIX[existing.data.type as SessionType]}/${existing.data.id}`,
      type: existing.data.type as SessionType,
    }
  }

  // 🚨 PAID SESSION FLOW: Use unified session factory
  if (!supabaseUserId || !intakeId) {
    throw new Error('[fulfillment] User ID and intake ID required for session creation')
  }

  try {
    // Import session factory
    const { createSessionRecord } = await import('@/lib/sessionFactory')

    // Extract metadata for session factory
    const preferredMechanicId = (metadataPatch as any).preferred_mechanic_id || null
    const routingTypeFromMetadata = (metadataPatch as any).routing_type || routingType
    const urgent = (metadataPatch as any).urgent || false
    const isSpecialist = (metadataPatch as any).is_specialist || false

    // Create session using unified factory
    // Note: We skip active session check here because it's already done at the top of this function
    const result = await createSessionRecord({
      customerId: supabaseUserId,
      customerEmail,
      type: sessionType,
      plan,
      intakeId,
      stripeSessionId,
      paymentMethod: 'stripe',
      amountPaid: amountTotal,
      urgent,
      isSpecialist,
      preferredMechanicId,
      routingType: routingTypeFromMetadata,
      workshopId,
      slotId,
      skipActiveCheck: true  // Already checked above
    })

    console.log(`[fulfillment] ✓ Paid session created via factory: ${result.sessionId}`)

    // Track checkout completion in CRM
    void trackInteraction({
      customerId: supabaseUserId,
      interactionType: 'checkout_completed',
      sessionId: result.sessionId,
      metadata: {
        plan,
        session_type: sessionType,
        amount_total: amountTotal,
        currency: currency || 'usd',
        stripe_session_id: stripeSessionId,
      },
    })

    return {
      sessionId: result.sessionId,
      route: `${ROUTE_PREFIX[sessionType]}/${result.sessionId}`,
      type: sessionType,
    }
  } catch (error: any) {
    console.error('[fulfillment] Paid session creation failed:', error)
    throw new Error(`Failed to create paid session: ${error.message}`)
  }
}

async function upsertParticipant(sessionId: string, supabaseUserId?: string | null) {
  if (!supabaseUserId) {
    return
  }

  // Validate foreign keys before insert
  try {
    await validateSessionParticipantReferences({
      sessionId,
      userId: supabaseUserId
    })
  } catch (error) {
    if (error instanceof ForeignKeyValidationError) {
      throw new Error(`[fulfillment] Foreign key validation failed: ${error.message}`)
    }
    throw error
  }

  const payload: ParticipantInsert = {
    session_id: sessionId,
    user_id: supabaseUserId,
    role: 'customer',
  }

  const { error } = await supabaseAdmin.from('session_participants').upsert(
    {
      ...payload,
    },
    { onConflict: 'session_id,user_id' },
  )

  if (error) {
    throw new Error(`[fulfillment] Failed to upsert session participant: ${error.message}`)
  }
}

// ============================================================================
// SESSION_REQUESTS DEPRECATED
// ============================================================================
// All session_request creation logic has been removed.
// The unified session factory now creates session_assignments directly.
// Mechanics see assignments in /api/mechanic/queue instead of /api/mechanics/requests
// ============================================================================
