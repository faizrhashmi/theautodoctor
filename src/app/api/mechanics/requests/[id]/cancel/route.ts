import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'
import { requireMechanicAPI } from '@/lib/auth/guards'

/**
 * Undo/Cancel a request acceptance
 * This unlocks the request so other mechanics can see and accept it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = params.id
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 })
  }

  // Require mechanic authentication (Supabase Auth)
  const authResult = await requireMechanicAPI(request)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  // Get the request to verify it's assigned to this mechanic
  const { data: existingRequest, error: fetchError } = await supabaseAdmin
    .from('session_requests')
    .select('id, mechanic_id, customer_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchError) {
    console.error('[cancel-request] Error fetching request:', fetchError)
    return NextResponse.json({ error: 'Unable to fetch request' }, { status: 500 })
  }

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Verify this mechanic owns the request
  if (existingRequest.mechanic_id !== mechanic.id) {
    return NextResponse.json({ error: 'You can only cancel requests you have accepted' }, { status: 403 })
  }

  // Can only cancel accepted requests (not live sessions)
  if (existingRequest.status !== 'accepted') {
    return NextResponse.json({ error: `Cannot cancel request with status: ${existingRequest.status}` }, { status: 400 })
  }

  // Update request back to pending
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('session_requests')
    .update({
      mechanic_id: null,
      status: 'pending',
      accepted_at: null
    })
    .eq('id', requestId)
    .select()
    .maybeSingle()

  if (updateError || !updated) {
    console.error('[cancel-request] Error updating request:', updateError)
    return NextResponse.json({ error: 'Unable to cancel request' }, { status: 500 })
  }

  // Find and delete the associated session (if it hasn't started yet)
  const { data: associatedSession } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('customer_user_id', existingRequest.customer_id)
    .eq('mechanic_id', mechanic.id)
    .in('status', ['waiting', 'pending', 'scheduled'])
    .maybeSingle()

  if (associatedSession) {
    // Delete the session since it hasn't started
    await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', associatedSession.id)

    console.log('[cancel-request] Deleted associated session:', associatedSession.id)
  }

  // Broadcast that request is back to pending (other mechanics will see it)
  void broadcastSessionRequest('request_cancelled', {
    id: updated.id,
    mechanicId: mechanic.id,
    mechanicName: mechanic.name ?? mechanic.email ?? 'Mechanic',
  })

  return NextResponse.json({
    success: true,
    message: 'Request cancelled successfully',
    request: updated
  })
}
