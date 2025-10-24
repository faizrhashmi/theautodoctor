import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('id')

  if (!sessionId) {
    // If no ID provided, show active sessions first
    const { data: activeSessions } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: recentSessions } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      activeSessions: activeSessions,
      activeCount: activeSessions?.length || 0,
      recentVideoSessions: recentSessions,
      count: recentSessions?.length || 0
    })
  }

  // Check specific session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json({ error: 'Error fetching session', details: sessionError }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({
      found: false,
      message: '❌ SESSION NOT FOUND',
    })
  }

  // Check if there's a corresponding request
  let requestData = null
  if (session.customer_user_id) {
    const { data: request } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('customer_id', session.customer_user_id)
      .eq('session_type', session.type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    requestData = request
  }

  // Get customer info
  let customerData = null
  if (session.customer_user_id) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, email')
      .eq('user_id', session.customer_user_id)
      .maybeSingle()

    customerData = customer
  }

  return NextResponse.json({
    found: true,
    session: {
      id: session.id,
      status: session.status,
      type: session.type,
      customer_user_id: session.customer_user_id,
      mechanic_id: session.mechanic_id || null,
      intake_id: session.intake_id || null,
      plan: session.plan,
      created_at: session.created_at,
      started_at: session.started_at || null,
      ended_at: session.ended_at || null,
    },
    customer: customerData,
    correspondingRequest: requestData ? {
      id: requestData.id,
      status: requestData.status,
      mechanic_id: requestData.mechanic_id || null,
      created_at: requestData.created_at,
      accepted_at: requestData.accepted_at || null,
    } : null,
    diagnosis: !requestData
      ? '❌ Session exists but NO corresponding request found. Mechanics cannot see this session.'
      : requestData.status !== 'pending'
        ? `⚠️ Request exists but status is "${requestData.status}" (not "pending")`
        : requestData.mechanic_id !== null
          ? `⚠️ Request assigned to mechanic ${requestData.mechanic_id}`
          : '✓ Request exists and should be visible to mechanics',
  })
}
