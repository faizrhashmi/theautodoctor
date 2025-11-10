import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, params.id)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${params.id}] ${participant.role} accessing session ${participant.sessionId}`)

  try {
    // Fetch session data without complex joins to avoid foreign key issues
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error(`[GET /sessions/${params.id}] Database error:`, error)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch customer profile separately
    let customerProfile: any = null
    if (session.customer_user_id) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', session.customer_user_id)
        .single()
      customerProfile = data
    }

    // Fetch mechanic profile separately
    let mechanicProfile: any = null
    if (session.mechanic_id) {
      // mechanic_id is auth user ID, get profile from profiles table
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', session.mechanic_id)
        .single()
      mechanicProfile = data
    }

    // Fetch intake/vehicle data if available
    let intakeData: any = null
    if (session.intake_id) {
      const { data: intake } = await supabaseAdmin
        .from('intakes')
        .select(`
          id,
          concern_summary,
          urgent,
          vehicle_id
        `)
        .eq('id', session.intake_id)
        .single()

      if (intake && intake.vehicle_id) {
        const { data: vehicle } = await supabaseAdmin
          .from('vehicles')
          .select('id, year, make, model, vin, plate')
          .eq('id', intake.vehicle_id)
          .single()

        intakeData = {
          ...intake,
          vehicle
        }
      } else {
        intakeData = intake
      }
    }

    // Fetch chat messages for this session (without join to avoid FK issues)
    const { data: chatMessages, error: chatError } = await supabaseAdmin
      .from('chat_messages')
      .select('id, content, created_at, sender_id, attachments')
      .eq('session_id', params.id)
      .order('created_at', { ascending: true })

    console.log(`[GET /sessions/${params.id}] Chat messages (raw):`, {
      count: chatMessages?.length || 0,
      mechanicId: session.mechanic_id,
      customerUserId: session.customer_user_id,
      sampleSenderIds: chatMessages?.slice(0, 3).map(m => m.sender_id),
      error: chatError
    })

    // Enrich messages with sender names
    let enrichedMessages: any[] = []
    if (chatMessages && chatMessages.length > 0) {
      // Get unique sender IDs
      const senderIds = [...new Set(chatMessages.map(m => m.sender_id))]

      // Fetch profiles for all senders
      const { data: senderProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds)

      const profileMap = new Map(senderProfiles?.map(p => [p.id, p.full_name]) || [])

      // Enrich messages with sender names
      enrichedMessages = chatMessages.map(msg => ({
        ...msg,
        sender: {
          full_name: profileMap.get(msg.sender_id) || 'Unknown User'
        }
      }))

      console.log(`[GET /sessions/${params.id}] Enriched ${enrichedMessages.length} messages`)
    }

    // Transform to clean response format
    const response = {
      id: session.id,
      type: session.type,
      status: session.status,
      plan: session.plan,
      base_price: session.base_price,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_minutes: session.duration_minutes,
      mechanic_notes: session.mechanic_notes,
      scheduled_for: session.scheduled_for,
      created_at: session.created_at,
      rating: session.rating,
      metadata: session.metadata,
      summary_data: session.summary_data,
      summary_submitted_at: session.summary_submitted_at,
      customer_user_id: session.customer_user_id,
      mechanic_id: session.mechanic_id,

      // Customer data (NO PHONE for mechanic privacy)
      customer_name: customerProfile?.full_name || null,
      customer_email: customerProfile?.email || null,

      // Mechanic data
      mechanic_name: mechanicProfile?.full_name || null,
      mechanic_email: mechanicProfile?.email || null,

      // Vehicle data from intake
      vehicle: intakeData?.vehicle
        ? `${intakeData.vehicle.year} ${intakeData.vehicle.make} ${intakeData.vehicle.model}`
        : null,
      vehicle_vin: intakeData?.vehicle?.vin || null,
      vehicle_plate: intakeData?.vehicle?.plate || null,

      // Intake concern
      concern_summary: intakeData?.concern_summary || null,
      urgent: intakeData?.urgent || false,

      // Chat transcript
      chat_messages: enrichedMessages || [],
      chat_message_count: enrichedMessages?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error(`[GET /sessions/${params.id}] Unexpected error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, params.id)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[PATCH /sessions/${params.id}] ${participant.role} updating session ${participant.sessionId}`)

  const updates = await req.json()
  const updated: SessionSummary = {
    ...MOCK_SESSION,
    ...updates,
    id: params.id
  }
  return NextResponse.json({ session: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, params.id)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[DELETE /sessions/${params.id}] ${participant.role} deleting session ${participant.sessionId}`)

  return NextResponse.json({ success: true, deletedId: params.id })
}
