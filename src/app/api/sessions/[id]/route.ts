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
    // Comprehensive query with all necessary joins
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        base_price,
        started_at,
        ended_at,
        duration_minutes,
        mechanic_notes,
        customer_user_id,
        mechanic_id,
        intake_id,
        scheduled_for,

        customer:profiles!customer_user_id (
          id,
          full_name,
          email
        ),

        mechanic:mechanics!mechanic_id (
          id,
          name,
          user_id,
          mechanic_profile:profiles!user_id (
            full_name,
            email
          )
        ),

        intake:intakes!intake_id (
          id,
          concern_summary,
          urgent,
          vehicle_id,
          vehicle:vehicles!vehicle_id (
            id,
            year,
            make,
            model,
            vin,
            plate
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error(`[GET /sessions/${params.id}] Database error:`, error)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch chat messages for this session
    const { data: chatMessages } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        attachments,
        sender:profiles!sender_id (
          full_name
        )
      `)
      .eq('session_id', params.id)
      .order('created_at', { ascending: true })

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

      // Customer data (NO PHONE for mechanic privacy)
      customer_name: session.customer?.full_name || null,
      customer_email: session.customer?.email || null,

      // Mechanic data (prioritize mechanic.name, fallback to profile)
      mechanic_name: session.mechanic?.name || session.mechanic?.mechanic_profile?.full_name || null,
      mechanic_email: session.mechanic?.mechanic_profile?.email || null,

      // Vehicle data from intake
      vehicle: session.intake?.vehicle
        ? `${session.intake.vehicle.year} ${session.intake.vehicle.make} ${session.intake.vehicle.model}`
        : null,
      vehicle_vin: session.intake?.vehicle?.vin || null,
      vehicle_plate: session.intake?.vehicle?.plate || null,

      // Intake concern
      concern_summary: session.intake?.concern_summary || null,
      urgent: session.intake?.urgent || false,

      // Chat transcript
      chat_messages: chatMessages || [],
      chat_message_count: chatMessages?.length || 0,
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
