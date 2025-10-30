import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import type { SessionSummary } from '@/types/session'

const MOCK_SESSION: SessionSummary = {
  id: 'queue-1',
  vehicle: '2020 Audi Q5',
  customerName: 'Brandon Lee',
  mechanicName: 'Jamie Carter',
  scheduledStart: new Date().toISOString(),
  scheduledEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  status: 'scheduled',
  concernSummary: 'Check engine light + rough idle',
  waiverAccepted: true,
  extensionBalance: 0
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, params.id)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${params.id}] ${participant.role} accessing session ${participant.sessionId}`)

  return NextResponse.json({ session: MOCK_SESSION })
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
