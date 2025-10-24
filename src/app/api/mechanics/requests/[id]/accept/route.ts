import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Get mechanic authentication token from cookie
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Validate mechanic session
    const { data: mechanicSession, error: mechanicSessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (mechanicSessionError || !mechanicSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(mechanicSession.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const requestId = params.id
    const mechanicId = mechanicSession.mechanic_id

    // First, get the request details to find the customer_id
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('customer_id, session_type, plan_code')
      .eq('id', requestId)
      .is('mechanic_id', null)
      .in('status', ['pending', 'unattended'])
      .single()

    if (fetchError || !request) {
      console.error('[ACCEPT REQUEST] Request not found:', { requestId, fetchError: fetchError?.message })
      return NextResponse.json({ error: 'Request not found or already accepted' }, { status: 404 })
    }

    console.log('[ACCEPT REQUEST] Found request:', { requestId, customerId: request.customer_id, mechanicId })

    // Update the session_request to assign it to this mechanic
    const { error: updateRequestError } = await supabaseAdmin
      .from('session_requests')
      .update({
        mechanic_id: mechanicId,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateRequestError) {
      console.error('[ACCEPT REQUEST] Failed to update request:', updateRequestError)
      return NextResponse.json({ error: updateRequestError.message }, { status: 400 })
    }

    console.log('[ACCEPT REQUEST] Request updated successfully')

    // Find the associated session and assign the mechanic
    // First, let's see ALL sessions for this customer to diagnose
    const { data: allCustomerSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, status, mechanic_id, created_at')
      .eq('customer_user_id', request.customer_id)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('[ACCEPT REQUEST] All sessions for customer:', allCustomerSessions)

    // Now find the session we can assign
    // Look for sessions that are pending OR have no mechanic assigned yet
    const { data: customerSession, error: findSessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status')
      .eq('customer_user_id', request.customer_id)
      .or('status.eq.pending,and(mechanic_id.is.null,status.in.(waiting,scheduled))')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findSessionError) {
      console.error('[ACCEPT REQUEST] Error finding session:', findSessionError)
      // Don't fail the request acceptance if session update fails
    }

    console.log('[ACCEPT REQUEST] Session search result:', {
      found: !!customerSession,
      sessionId: customerSession?.id,
      sessionStatus: customerSession?.status
    })

    // Update the session with mechanic and change status to 'waiting'
    if (customerSession) {
      const { error: updateSessionError } = await supabaseAdmin
        .from('sessions')
        .update({
          mechanic_id: mechanicId,
          status: 'waiting',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerSession.id)

      if (updateSessionError) {
        console.error('[ACCEPT REQUEST] Error updating session:', updateSessionError)
        // Don't fail the request acceptance if session update fails
      } else {
        console.log(`[ACCEPT REQUEST] Session ${customerSession.id} assigned to mechanic ${mechanicId} and set to 'waiting'`)
      }
    } else {
      console.warn(`[ACCEPT REQUEST] No pending session found for customer ${request.customer_id}`)
    }

    return NextResponse.json({ ok: true, sessionId: customerSession?.id })
  } catch (error) {
    console.error('[ACCEPT REQUEST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
