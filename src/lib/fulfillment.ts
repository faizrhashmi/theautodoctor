import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { type PlanKey } from '@/config/pricing'
import type { Database, Json } from '@/types/supabase'

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
  }: FulfillCheckoutOptions,
): Promise<FulfillCheckoutResult> {
  const sessionType = PLAN_TO_TYPE[plan]
  if (!sessionType) {
    throw new Error(`[fulfillment] Unsupported plan key "${plan}"`)
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
