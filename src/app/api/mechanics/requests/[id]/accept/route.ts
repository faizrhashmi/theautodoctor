import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastSessionRequest, toSessionRequest } from '@/lib/sessionRequests'

// Helper to get mechanic from custom auth cookie
async function getMechanicFromCookie(_req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = params.id
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 })
  }

  // Use custom mechanic auth instead of Supabase auth
  const mechanic = await getMechanicFromCookie(request)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized - Please log in as a mechanic' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: accepted, error: updateError} = await supabaseAdmin
    .from('session_requests')
    .update({ mechanic_id: mechanic.id, status: 'accepted', accepted_at: now })
    .eq('id', requestId)
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to accept session request', updateError)
    return NextResponse.json({ error: 'Unable to accept request' }, { status: 500 })
  }

  if (!accepted) {
    return NextResponse.json({ error: 'Request already claimed' }, { status: 409 })
  }

  // BUSINESS RULE ENFORCEMENT: Mechanic can only have ONE active/accepted request at a time
  // Check 1: Does mechanic have any active sessions?
  const { data: mechanicActiveSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('mechanic_id', mechanic.id)
    .in('status', ['waiting', 'live', 'scheduled'])
    .limit(1)

  if (mechanicActiveSessions && mechanicActiveSessions.length > 0) {
    // Rollback the accepted status
    await supabaseAdmin
      .from('session_requests')
      .update({ mechanic_id: null, status: 'pending', accepted_at: null })
      .eq('id', requestId)

    return NextResponse.json({
      error: 'You already have an active session. Please complete it before accepting new requests.'
    }, { status: 409 })
  }

  // Check 2: Does mechanic have any OTHER accepted requests?
  // (The current request is already marked as accepted, so exclude it)
  const { data: otherAcceptedRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id')
    .eq('mechanic_id', mechanic.id)
    .eq('status', 'accepted')
    .neq('id', requestId)
    .limit(1)

  if (otherAcceptedRequests && otherAcceptedRequests.length > 0) {
    // Rollback the accepted status
    await supabaseAdmin
      .from('session_requests')
      .update({ mechanic_id: null, status: 'pending', accepted_at: null })
      .eq('id', requestId)

    return NextResponse.json({
      error: 'You already have an accepted request. Please start that session or cancel it before accepting new requests.'
    }, { status: 409 })
  }

  // Find the existing session created from payment (it has customer_id but no mechanic_id)
  const { data: existingSession, error: findError } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('customer_user_id', accepted.customer_id)
    .is('mechanic_id', null)
    .in('status', ['pending', 'waiting', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error('Failed to find existing session', findError)
  }

  let sessionRow: { id: string } | null = null

  if (existingSession) {
    // Update the existing session to assign mechanic and set to 'waiting' (not 'live' yet)
    // Session will become 'live' when both participants join the chat room
    const { data: updated, error: updateSessionError } = await supabaseAdmin
      .from('sessions')
      .update({
        mechanic_id: mechanic.id,
        status: 'waiting',
        // Don't set started_at yet - it will be set when both participants join
        scheduled_start: now,
        scheduled_for: now,
      })
      .eq('id', existingSession.id)
      .select('id')
      .single()

    if (updateSessionError) {
      console.error('Failed to update session with mechanic', updateSessionError)
    } else {
      sessionRow = updated
      console.log('[accept-request] Assigned mechanic to existing session (status: waiting)', existingSession.id)
    }
  } else {
    // No existing session found, create a new one (fallback for old data)
    console.warn('[accept-request] No existing session found for customer, creating new one')
    const { data: created, error: createError } = await supabaseAdmin
      .from('sessions')
      .insert({
        mechanic_id: mechanic.id,
        customer_user_id: accepted.customer_id,
        status: 'waiting',
        plan: accepted.plan_code,
        type: accepted.session_type,
        stripe_session_id: `fallback_${accepted.id}`,
        // Don't set started_at yet - it will be set when both participants join
        scheduled_start: now,
        scheduled_for: now,
        metadata: {
          request_id: accepted.id,
          customer_name: accepted.customer_name ?? 'Customer',
          customer_email: accepted.customer_email ?? null,
        },
      })
      .select('id')
      .maybeSingle()

    if (createError) {
      console.error('Failed to create fallback session', createError)
    } else {
      sessionRow = created
    }
  }

  void broadcastSessionRequest('request_accepted', {
    id: accepted.id,
    mechanicId: accepted.mechanic_id,
    mechanicName: mechanic.name ?? mechanic.email ?? 'Mechanic',
  })

  return NextResponse.json({
    request: toSessionRequest(accepted),
    session: sessionRow ? { id: sessionRow.id } : null
  })
}
