// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ SECURITY FIX: Replace insecure cookie check with requireAdmin
  const auth = await requireAdmin(req)
  if (!auth.authorized) {
    return auth.response!
  }

  const { id: requestId } = await context.params

  console.warn(
    `[ADMIN ACTION] ${auth.profile?.full_name} manually assigning request ${requestId}`
  )
  const body = await req.json().catch(() => null)

  if (!body || !body.mechanicId) {
    return NextResponse.json({ error: 'mechanicId is required' }, { status: 400 })
  }

  const { mechanicId } = body

  // 1. Verify the request exists and is unattended
  const { data: request, error: requestError } = await supabaseAdmin
    .from('session_requests')
    .select('id, status, customer_id, session_type, plan_code')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    console.error('[admin/assign] Database error:', requestError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (request.status !== 'unattended') {
    return NextResponse.json(
      { error: `Cannot assign request with status '${request.status}'. Only unattended requests can be assigned.` },
      { status: 400 }
    )
  }

  // 2. Verify the mechanic exists
  const { data: mechanic, error: mechanicError } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', mechanicId)
    .maybeSingle()

  if (mechanicError || !mechanic) {
    return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
  }

  // 3. Check if mechanic already has an active session
  const { data: activeSessions } = await supabaseAdmin
    .from('session_requests')
    .select('id')
    .eq('mechanic_id', mechanicId)
    .eq('status', 'accepted')
    .limit(1)

  if (activeSessions && activeSessions.length > 0) {
    return NextResponse.json(
      {
        error: `Mechanic ${mechanic.name} already has an active session. Please wait until they complete their current session.`,
      },
      { status: 409 }
    )
  }

  // 4. Assign the request to the mechanic
  const { error: updateError } = await supabaseAdmin
    .from('session_requests')
    .update({
      mechanic_id: mechanicId,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('[admin/assign] Failed to assign request:', updateError)
    return NextResponse.json({ error: 'Failed to assign request' }, { status: 500 })
  }

  console.log(`[admin/assign] Request ${requestId} assigned to mechanic ${mechanicId} by admin`)

  return NextResponse.json({
    success: true,
    message: `Request assigned to ${mechanic.name}`,
    request: {
      id: requestId,
      mechanicId: mechanicId,
      mechanicName: mechanic.name,
      status: 'accepted',
    },
  })
}
