import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('id')

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
  }

  console.log('=== CHECKING REQUEST ===')
  console.log('Request ID:', requestId)

  // Check session_requests table
  const { data: request, error: reqError } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (reqError) {
    return NextResponse.json({ error: 'Error fetching request', details: reqError }, { status: 500 })
  }

  if (!request) {
    return NextResponse.json({
      found: false,
      message: '❌ REQUEST NOT FOUND in session_requests table',
      recommendation: 'Request does not exist. It may have been deleted or the ID is incorrect.'
    })
  }

  // Check if there's a session
  let sessionData = null
  if (request.customer_id) {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('customer_user_id', request.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    sessionData = session
  }

  // Check all pending requests
  const { data: allPending } = await supabaseAdmin
    .from('session_requests')
    .select('id, status, mechanic_id, customer_name, created_at')
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .order('created_at', { ascending: true })

  const isInPendingList = allPending?.some(r => r.id === requestId)

  // Diagnosis
  let diagnosis = ''
  let visible = false

  if (request.status !== 'pending') {
    diagnosis = `❌ Request status is "${request.status}" but mechanics only see "pending" requests. Solution: Update status to "pending" or check why it changed.`
  } else if (request.mechanic_id !== null) {
    diagnosis = `❌ Request is assigned to mechanic ${request.mechanic_id}. Only that specific mechanic will see it in their "accepted" list. Solution: Set mechanic_id to NULL to make it available to all mechanics.`
  } else {
    diagnosis = '✓ Request appears to be correctly configured (status=pending, mechanic_id=null). It should be visible on mechanic dashboard. Check: 1) Browser cache (hard refresh), 2) Realtime subscriptions, 3) Browser console errors'
    visible = true
  }

  return NextResponse.json({
    found: true,
    request: {
      id: request.id,
      status: request.status,
      customer_id: request.customer_id,
      customer_name: request.customer_name,
      mechanic_id: request.mechanic_id || null,
      session_type: request.session_type,
      plan_code: request.plan_code,
      created_at: request.created_at,
      accepted_at: request.accepted_at || null,
    },
    session: sessionData ? {
      id: sessionData.id,
      status: sessionData.status,
      mechanic_id: sessionData.mechanic_id || null,
      type: sessionData.type,
      intake_id: sessionData.intake_id || null,
      created_at: sessionData.created_at,
      started_at: sessionData.started_at || null,
    } : null,
    pendingRequestsCount: allPending?.length || 0,
    isInPendingList,
    shouldBeVisibleToMechanics: visible,
    diagnosis,
  })
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
