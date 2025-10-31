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

    // Create session_request to notify mechanics (if not already created)
    if (supabaseUserId) {
      await createSessionRequest({
        customerId: supabaseUserId,
        sessionType: existing.data.type as SessionType,
        planCode: plan,
        customerEmail,
        workshopId,
        routingType,
      })
    }

    return {
      sessionId: existing.data.id,
      route: `${ROUTE_PREFIX[existing.data.type as SessionType]}/${existing.data.id}`,
      type: existing.data.type as SessionType,
    }
  }

  const insertPayload: SessionInsert = {
    stripe_session_id: stripeSessionId,
    intake_id: intakeId ?? null,
    type: sessionType,
    status: 'pending',
    plan,
    customer_user_id: supabaseUserId ?? null,
    metadata: metadataPatch as Json,
  }

  const insert = await supabaseAdmin.from('sessions').insert(insertPayload).select('id').single()

  if (insert.error || !insert.data) {
    throw new Error(`[fulfillment] Unable to create session record: ${insert.error?.message ?? 'unknown error'}`)
  }

  await upsertParticipant(insert.data.id, supabaseUserId)

  // Create session_request to notify mechanics
  console.log('[fulfillment] About to create session_request. supabaseUserId:', supabaseUserId, 'sessionType:', sessionType, 'plan:', plan, 'workshopId:', workshopId)
  if (supabaseUserId) {
    await createSessionRequest({
      customerId: supabaseUserId,
      sessionType,
      planCode: plan,
      customerEmail,
      workshopId,
      routingType,
    })

    // Track checkout completion in CRM
    void trackInteraction({
      customerId: supabaseUserId,
      interactionType: 'checkout_completed',
      sessionId: insert.data.id,
      metadata: {
        plan,
        session_type: sessionType,
        amount_total: amountTotal,
        currency: currency || 'usd',
        stripe_session_id: stripeSessionId,
      },
    })
  } else {
    console.warn('[fulfillment] No supabaseUserId - cannot create session_request')
  }

  return {
    sessionId: insert.data.id,
    route: `${ROUTE_PREFIX[sessionType]}/${insert.data.id}`,
    type: sessionType,
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

type CreateSessionRequestOptions = {
  customerId: string
  sessionType: SessionType
  planCode: string
  customerEmail?: string | null
  workshopId?: string | null
  routingType?: 'workshop_only' | 'broadcast' | 'hybrid'
}

async function createSessionRequest({
  customerId,
  sessionType,
  planCode,
  customerEmail,
  workshopId = null,
  routingType = 'broadcast',
}: CreateSessionRequestOptions) {
  try {
    // Validate foreign keys before creating session request
    try {
      await validateSessionRequestReferences({
        customerId,
        workshopId
      })
    } catch (error) {
      if (error instanceof ForeignKeyValidationError) {
        console.error(`[fulfillment] Foreign key validation failed: ${error.message}`)
        throw new Error(`Cannot create session request: ${error.message}`)
      }
      throw error
    }

    // Cancel any old pending requests for this customer (they're starting a new session)
    const { data: oldRequests } = await supabaseAdmin
      .from('session_requests')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .is('mechanic_id', null)

    if (oldRequests && oldRequests.length > 0) {
      console.log(`[fulfillment] Cancelling ${oldRequests.length} old pending request(s) for customer`, customerId)
      await supabaseAdmin
        .from('session_requests')
        .update({ status: 'cancelled' })
        .eq('customer_id', customerId)
        .eq('status', 'pending')
        .is('mechanic_id', null)
    }

    console.log('[fulfillment] Creating new session_request for customer', customerId)

    // Get customer name from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', customerId)
      .maybeSingle()

    const customerName = profile?.full_name || customerEmail || 'Customer'

    // Create the session request with smart routing
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('session_requests')
      .insert({
        customer_id: customerId,
        session_type: sessionType,
        plan_code: planCode,
        status: 'pending',
        customer_name: customerName,
        customer_email: customerEmail || null,
        preferred_workshop_id: workshopId,
        routing_type: workshopId ? routingType : 'broadcast',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[fulfillment] Failed to create session request:', insertError)
      // Don't throw - we don't want to fail the whole payment flow if this fails
    } else {
      console.log('[fulfillment] Session request created successfully for customer', customerId)
      console.log('[fulfillment] Routing type:', routingType, 'Workshop ID:', workshopId)

      // CRITICAL: Add delay before broadcasting to allow database replication
      // Supabase connection pooler needs time to propagate the write
      await new Promise(resolve => setTimeout(resolve, 3000))
      console.log('[fulfillment] ⏱️ Waited 3s for database replication')

      // Smart routing: Notify mechanics based on routing strategy
      if (newRequest) {
        if (workshopId && routingType === 'workshop_only') {
          // Workshop-only: Only notify mechanics from selected workshop
          console.log('[fulfillment] Workshop-only routing to workshop:', workshopId)
          void broadcastSessionRequest('new_request', {
            request: newRequest,
            targetWorkshopId: workshopId,
            routingType: 'workshop_only',
          })
        } else if (workshopId && routingType === 'hybrid') {
          // Hybrid: Prefer workshop mechanics but allow others if none available
          console.log('[fulfillment] Hybrid routing with preference for workshop:', workshopId)
          void broadcastSessionRequest('new_request', {
            request: newRequest,
            targetWorkshopId: workshopId,
            routingType: 'hybrid',
          })
        } else {
          // Broadcast: Notify all available mechanics
          console.log('[fulfillment] Broadcast routing to all mechanics')
          void broadcastSessionRequest('new_request', {
            request: newRequest,
            routingType: 'broadcast',
          })
        }
      }
    }
  } catch (error) {
    console.error('[fulfillment] Error creating session request:', error)
    // Don't throw - we don't want to fail the whole payment flow if this fails
  }
}
