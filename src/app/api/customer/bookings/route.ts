import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'
import { PRICING, type PlanKey } from '@/config/pricing'

const SCHEDULABLE_PLANS: PlanKey[] = ['video15', 'diagnostic']

const PLAN_TO_SESSION_TYPE: Record<PlanKey, 'chat' | 'video' | 'diagnostic'> = {
  chat10: 'chat',
  video15: 'video',
  diagnostic: 'diagnostic',
}

function isPlanKey(value: string | null | undefined): value is PlanKey {
  return value === 'chat10' || value === 'video15' || value === 'diagnostic'
}

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(request)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} creating booking`)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const planValue = typeof body.plan === 'string' ? body.plan : null
  if (!isPlanKey(planValue)) {
    return NextResponse.json({ error: 'Unsupported plan' }, { status: 400 })
  }

  if (!SCHEDULABLE_PLANS.includes(planValue)) {
    return NextResponse.json({ error: 'Plan does not support scheduling' }, { status: 403 })
  }

  const startInput = typeof body.start === 'string' ? body.start : null
  const endInput = typeof body.end === 'string' ? body.end : null
  const timezone = typeof body.timezone === 'string' ? body.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone

  if (!startInput || !endInput) {
    return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
  }

  const startDate = new Date(startInput)
  const endDate = new Date(endInput)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date values' }, { status: 400 })
  }

  if (endDate <= startDate) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }

  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const expectedDuration = planValue === 'diagnostic' ? 60 : planValue === 'video15' ? 45 : 30
  if (Math.abs(durationMinutes - expectedDuration) > 5) {
    return NextResponse.json({ error: 'Selected time does not match plan duration' }, { status: 400 })
  }

  const sessionType = PLAN_TO_SESSION_TYPE[planValue]

  const insertPayload: Database['public']['Tables']['sessions']['Insert'] = {
    plan: planValue,
    type: sessionType,
    status: 'scheduled',
    stripe_session_id: `manual-${randomUUID()}`,
    customer_user_id: customer.id,
    metadata: {
      booked_via: 'calendar',
      timezone,
      plan_label: PRICING[planValue]?.name ?? planValue,
    },
    scheduled_start: startDate.toISOString(),
    scheduled_end: endDate.toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert(insertPayload)
    .select('id, status, plan, type, scheduled_start, scheduled_end')
    .single()

  if (error || !data) {
    console.error('[customer/bookings] insert error', error)
    return NextResponse.json({ error: 'Unable to save booking' }, { status: 500 })
  }

  return NextResponse.json({
    booking: {
      id: data.id,
      status: data.status ?? 'scheduled',
      plan: data.plan as PlanKey,
      type: data.type ?? sessionType,
      start: data.scheduled_start ?? startDate.toISOString(),
      end: data.scheduled_end ?? endDate.toISOString(),
    },
  })
}
